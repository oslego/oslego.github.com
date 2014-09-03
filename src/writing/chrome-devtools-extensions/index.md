# Lessons learned building Chrome DevTools Extensions

<p class="meta">
<time datetime="2012-09-4 00:00">4 Sep 2014</time> - London
</p>

In this article, I'm going to share some of the lessons I learned while building the CSS Shapes Editor extension for Chrome DevTools. This is not a tutorial on creating extensions. There's a [better place](https://developer.chrome.com/extensions/overview) for that. This is a list of things I discovered and a few less-obvious solutions to problems you might encounter when building your own extensions.

## Overview of CSS Shapes Editor for Chrome

There are a few types of Chrome extensions: page actions, button actions, developer tools extensions, and UI-less extensions which only inject scripts or stylesheets.

The CSS Shapes Editor for Chrome extends the DevTools, specifically the Elements panel to which it adds an extra sidebar called _Shapes_. This sidebar provides controls to edit values of shape properties of the selected element. Editing is done with an interactive editor placed on top of the selected element. This editor lives in the inspected page and is injected as a **content script**. Changes to the editor on the page are echoed back to the _Shapes_ sidebar.

The shapes editor is an [independent library](https://github.com/adobe-webplatform/css-shapes-editor). Its inner workings are beyond the scope of this article. Suffice to say, the editor is initialized on demand by the Chrome extension with the selected element and shape value.

## Components of a DevTools extension

Chrome DevTools extensions add an extra level of complexity over others because they are treated as independent web pages. They are blessed with access to `chrome.devtools` APIs which is denied to other types of extensions.

At the very minimum, a DevTools extension includes:

- a [manifest file](https://developer.chrome.com/extensions/overview#manifest)
- a `background` [page or script](https://developer.chrome.com/extensions/overview#background_page)
- a `devtools_page` [page](https://developer.chrome.com/extensions/devtools#devtools-page)

The CSS Shapes Editor for Chrome extension also includes:

- a [content script](https://developer.chrome.com/extensions/content_scripts)
- explicit permissions

In order for the shapes editor extension to function properly, all of these need to work in a very orchestrated manner.

- The `devtools_page` is the one with access to the special `chrome.devtools` APIs. However, it is very sandboxed and can't access most other APIs. It also can't have 2-way communication with the inspected page.

- The content script is a JavaScript file injected into the inspected page. It lives in **its own JavaScript context** (this is important), which means it cannot interact with other scripts on the inspected page. From a security point of view, this is very good. The content script can, however, interact with the same DOM as the other scripts in the page. Particular code architecture means that it is possible to exchange data between the two worlds. The content script can't communicate directly with the `devtools_page` and it can't use most `chrome` APIs.

- The `background` page is the most empowered piece of the extension puzzle. It does have access to most `chrome` APIs and it can exchange messages both with the inspected page (including the content script) and with the `devtools_page`. Because of this, the `backround` page is used as a communication relay.

[illustration of extension messaging flow]

## Messaging between DevTools and the content script

The DevTools page and the content script can't talk directly to each other. The `background` page is used as relay. It listens to port connections and messages on the `chrome.runtime` API from either side and passes the messages between the two. You should use different port names for either side, otherwise the relay won't work.

```js
/* in devtools_page */
port = chrome.runtime.connect({ name: 'devtools'});

/* in content script */
port = chrome.runtime.connect({ name: 'content-script'});

/* in background page */
var devToolsPort,
    contentScriptPort;

chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === "devtools"){
    devToolsPort = port;
    devToolsPort.onMessage.addListener(function(data){
      contentScriptPort.postMessage(data);
    });
  }

  if (port.name === "content-script"){
    contentScriptPort = port;
    contentScriptPort.onMessage.addListener(function(data){
      devToolsPort.postMessage(data);
    });
  }
});

```

The messages are passed along as JSON. Treating the message type and contents is up to the receiving party. You can add extra logic for message filtering in the `background` page if that's needed.

Either way, you should **always** make sure to treat incoming messages for expected input. A rogue page can hijack your extension if the content script blindly picks up data from the page and passes it onto messages which reach parts of the extension with access to privileged APIs like `chrome.history`, `chrome.storage` and others.

To mitigate this risk, it's best to create extensions which require the least amount of permissions for their task.

## Passing the selected element to the content script

The `devtools_page` page has access to the `chrome.devtools.inspectedPage` API, which it can use to eval scripts in the JavaScript context of the content script. This is a form of one-way communication between the DevTools and the isolated environment of the content script. It's particularly useful if you need to communicate the currently selected element to a method which lives in the content script.

```js
/* in content script */
function show(element){
  element.classList.add('show');
}

/* in devtools_page */
chrome.devtools.inspectedWindow.eval('show($0)', { useContentScriptContext: true });

```
In this case, `$0` points to the DOM reference of the selected element from the Elements panel. The optional `{ useContentScriptContext: true }` is crucial here. This instructs the browser to eval the given expression in the context of the content script context. Without it, the eval happens in the regular JavaScript context of the inspected page.

The API changed while I was developing the extension. Before the `useContentScriptContext` option became available (or was documented), I used to mark the selected element with a unique attribute calling the regular JavaScript context, then pass this attribute to the content script and have it use `document.querySelector()` to find the selected element. This exploits the ability of the content script to operate on the same DOM as the other scripts on the inspected page. It worked, but, needless to say, the `useContentScriptContext` option is much more practical.

## Reacting when the DevTools window was closed

It's not as straightforward as it should be.

The `chrome.devtools.panels.elements` API can be used to [create additional sidebars](https://developer.chrome.com/extensions/devtools_panels#type-ElementsPanel) for the _Elements_ panel. A sidebar calls handlers for its `onShown()` and `onHidden()` methods when a user opens it or navigates away from it, for example switching to something other than the _Elements_ panel. (`onShown()` and `onHidden()` are not events, though it would be more practical if they were; now they follow the [Observer](http://addyosmani.com/resources/essentialjsdesignpatterns/book/#observerpatternjavascript) pattern).

However, `onHidden()`'s handlers **will not be called** when DevTools window is closed. If you rely on it do to some cleanup, like teardown some active parts elsewhere in the extension, your code will not be called in this situation.

The [solution to this problem](https://groups.google.com/a/chromium.org/forum/#!topic/chromium-extensions/4Ge-51oHiZI) relies on the `background` page handling the communication channels. In a nutshell: from the `dev_tools` page, connect to a port with the `chrome.runtime` API, then listen to its connect and disconnect in the `background` page and trigger code from there. When the DevTools window is closed, its communication ports will be automatically disconnected. The `background` page lives on even after the DevTools window is turned off. This way, the `background` page can be used to trigger code in other parts of the extension.

```js
/* in dev_tools page */
port = chrome.runtime.connect({ name: 'devtools'});

/* in background page */
chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === "devtools"){
    port.onDisconnect.addListener(function(e){
      // DevTools window has likely closed; trigger cleanup.
    });
  }
});

```

What's important to grasp about Chrome extensions - this includes DevTools extensions - is that they're not individual files, but a bundle of scripts running in different contexts. While one part of an extension may be dormant, others may still be active. In most cases, the `background` page is active, waiting for triggers.


## Wish list for the Chrome DevTools API

What follows is a personal wish list for improvements I'd like to see in the Chrome DevTools extensibility API and documentation.

### Extending the Styles sidebar

While developing the shapes editor extension, I had to re-implement parts of the _Styles_ sidebar. I did so in order to attach triggers for the custom editor next to shape and clip-path properties. Of course, a lot of the features from the re-implemented sidebar are missing: matching selectors, CSS cascade inspector, code-editing, sync with DOM mutations, and so forth. That's a lot of extra effort, just to add a specialized custom editor for one property.

It would be much more practical, both for developers and for users, to be able to extend the _Styles_ sidebar with custom editors for specific CSS values. At the time of this writing, the color picker is the only specialized editor which exists in the _Styles_ panel, and it is baked into that code.

There is a lot of potential for tooling around CSS values. [Firefox DevTools](https://hacks.mozilla.org/category/developer-tools/) points the way with its advances such as [CSS transform highlighter](https://hacks.mozilla.org/wp-content/uploads/2014/07/dev-tools-transform-highlighter.png) and the [cubic bezier editor](https://www.youtube.com/watch?v=LemdYmcRrb0).

I logged a [Chrome bug](https://code.google.com/p/chromium/issues/detail?id=399607) requesting an API for extending the _Styles_ sidebar with some ideas of what functionality might be needed. If you too feel there's a need for this API in order to encourage more CSS tooling development, please star and contribute to that Chrome bug to draw attention to it.

- Styles panel extension API
- Promise-based API
- Improved documentation
-
