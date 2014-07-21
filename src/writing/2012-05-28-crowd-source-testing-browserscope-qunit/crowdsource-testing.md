# Crowdsource Testing with QUnit and Browserscope

<p class="meta">28 May 2012 - Bucharest</p>

This post will teach you how to streamline your cross-browser JavaScript-driven testing by using the [QUnit](http://docs.jquery.com/Qunit) testing framework with [Browserscope.org](http://www.browserscope.org/).

I'll assume you have previous working experience with JavaScript-driven testing and [QUnit](http://docs.jquery.com/Qunit) in particular.

## Crash Course in Browserscope

[Browserscope.org](http://www.browserscope.org/) is an open-source distributed testing platform. Its main purpose is to profile web browsers and test for modern features.

Browserscope works by running test suites in users' browsers. It then aggregates the results with a simple JavaScript beacon. Some magic User Agent sniffing happens server-side and the results are groupped by the matching browser.

The results are aggregated and presented in a table view that's easy to filter by browser class, version or family. Here's a sample of [test results](http://www.browserscope.org/user/tests/table/agt1YS1wcm9maWxlcnINCxIEVGVzdBib2KQGDA) for running Modernizr. These results are very valuable because they reflect the state of the web in working environments of real users.

The even more valuable thing is that Bowserscope has an API that you can bend to your own desire by running your own test suite and aggregate data.

## Working with the Browserscope API

[Browserscope.org](http://www.browserscope.org/) hosts the code which is stacked onto Google's App Engine platform. Alternatively you can [download the source](http://code.google.com/p/browserscope/source/checkout) and run it on our own infrastructure.

You'll need to sign in with a Google ID in order to use the hosted version of Browserscope.

Once inside you'll be able to create tests. "Test" is rather an overstatement. What you get is actually the important <code>_bTestKey</code> value, which is a unique identifier to be used with your test suite, and a bunch of useful links.

The [Browserscope API documentation](http://www.browserscope.org/api) does a good job of describing the workflow for you as a developer.

Here's the gist of it:

You get the responsibility of creating and hosting a test page. This page must contain a test suite using a framework of your choice. After running the tests your code must populate a global variable called <code>_bTestResults</code>. This variable reference an object which holds key/value pairs representing the names and results of the tests. Bear in mind that the values may only be numeric entries.

<pre>
// Populate the beacon with test results
var _bTestResults = {
    "test one": 0,
    "test two": 1
}
</pre>

Once you're done you have to load a script from the Browserscope.org host passing in the value of your "_bTestKey" test key. The script will collect the test results and send them over to the Browserscope instance. Magic happens there.

<pre>
// Beacon the results to Browserscope.
(function(document) {
    var testKey = 'CHANGE-THIS-TO-YOUR-TEST-KEY',
        newScript = document.createElement('script'),
        firstScript = document.getElementsByTagName('script')[0]

    newScript.src = 'http://www.browserscope.org/user/beacon/' + testKey
    firstScript.parentNode.insertBefore(newScript, firstScript)
}(document))
</pre>

There are other parameters you can pass along to the beacon script, including one for pointing to something other than that pesky global variable. Check out the [documentation](http://www.browserscope.org/api).


## The QUnit API meets Browserscope

QUnit provides a simple to use [API](http://docs.jquery.com/Qunit#Integration_into_Browser_Automation_Tools) that's useful for making it talk to third party tools.

Joining QUnit with Browserscope for effectively aggregating test results is trivial. Just define some functionality on top of readily available QUnit callbacks **before** running the test suite.

You can build up the <code>_bTestResults</code> that Browserscope requires by using the <code>QUnit.testDone</code> callback. The framework passes in a single argument - an object with data about the test that just completed.

<pre>
/*
test = {
    // name of the test that completed
    name: "test one",

    // number of failed assertions
    failed: 0,

    // number of successful assertions
    passed: 1,

    // number of expected assertions
    total: 1
}
*/

QUnit.testDone = function(test){

    // make sure all assertions passed successfully
    if (!test.failed && test.total === test.passed){
        _bTestResults[test.name] = 1
    }
    else{
        _bTestResults[test.name] = 0
    }
}
</pre>

When the test suite is done running you're ready to pass the results to Browserscope. The <code>QUnit.done</code> callback is useful for this.

<pre>
QUnit.done = function(){
    var testKey = 'CHANGE-THIS-TO-YOUR-TEST-KEY',
        newScript = document.createElement('script'),
        firstScript = document.getElementsByTagName('script')[0]

    newScript.src = 'http://www.browserscope.org/user/beacon/' + testKey
    firstScript.parentNode.insertBefore(newScript, firstScript)
}
</pre>

It would be apropriate to ask for the user's permission before sending out this data.

Now, just send out the link to the test page to friends, fellow developers and the world. In time, you'll start building a database of results on the browsers used by your helpful testers.

Crowdsource testing done easy.

## Getting results out of Browserscope

In your settings page on Browserscope.org you can see a near-realtime results table of people actively running your tests.

Browserscope offers a simple yet effective table widget for viewing aggregated results. Use this by embedding a script referencing the test key used when sending in results.

<pre>
&lt;script src="http://www.browserscope.org/user/tests/table/CHANGE-THIS-TO-YOUR-TEST-KEY?o=js"&gt;&lt;/script&gt;
</pre>

This URL is the endpoint for getting results out of Browserscope. There are other parameters that can yield JSON output with JSONP support or plain HTML markup. Filtering and highlighting are also available. Check out the [documentation](http://www.browserscope.org/api#urlparams).

This simple but effective API means that you're free to develop your own visualization of the results. It's what you do with this data that's important.

## Getting started

If this sparked your interest in trying out crowdsource testing with QUnit and Browserscope feel free to start from this [example source code](https://gist.github.com/2819653) I wrote for you.

Have fun!
