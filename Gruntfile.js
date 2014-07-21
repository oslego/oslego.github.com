/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 2, maxerr: 50 */
/*global module, require */

var marked = require('marked'),
    path = require('path'),
    handlebars = require('handlebars');


/*
  Attempts to find and return the innerHTML of the first <h1> element fround in the input string.
  Returns undefined if not match found.

  @param {string} str
  @return {string|undefined}
*/
function getH1(str){
  var matches = str.match(/<h1(?:.+)>(.+)<\/h1>/i);
  return matches && matches[1];
}

/*
  Attempts to find and return the innerHTML of the first <time> element fround in the input string.
  Returns undefined if not match found.

  @param {string} str
  @return {string|undefined}
*/
function getTime(str){
  var matches = str.match(/<time(?:.+)>(.+)<\/time>/i);
  return matches && matches[1];
}

module.exports = function (grunt) {

    'use strict';

    // load all grunt plugins defined in package.json
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

      pkg: grunt.file.readJSON("package.json"),

      // configurable paths
      project: {
        src: 'src',
        dist: 'dist',
        posts: 'src/writing/*/*.md',
        pages: ['src/about/*.md']
      },

      template: {
        master: handlebars.compile(grunt.file.read('src/_templates/master.html')),
        post: handlebars.compile(grunt.file.read('src/_templates/post.html'))
      },

      // metatdata for posts archive; populated by 'convert' task
      archive: {},

      banner: grunt.file.read('./COPYRIGHT')
                  .replace(/@NAME/, '<%= pkg.name %>')
                  .replace(/@DESCRIPTION/, '<%= pkg.description %>')
                  .replace(/@VERSION/, '<%= pkg.version %>')
                  .replace(/@DATE/, grunt.template.today("yyyy-mm-dd")),

      watch: {
        sass: {
          files: ['<%= project.src %>/sass{,*/}*.scss'],
          tasks: ['sass']
        }
      },

      sass: {
        main:{
          options: {
            style: 'expanded',
            banner: '<%= banner %>'
          },
          files: {
            '<%= project.src %>/css/style.css': '<%= project.src %>/_sass/style.scss'
          }
        }
      },

      copy: {
        main: {
          // copy everything from src/ to dist/, but skip paths which start with an underscore, and markdown files
          files: [{
            expand: true,
            cwd: '<%= project.src %>',
            src: ['**', '!_*/**', '!**/*.md'],
            dest: '<%= project.dist %>'
          }]
        }
      },

      clean: {
        // delete all files under dist/, but skips dist/README.md
        dist: ["<%= project.dist %>/*", "!<%= project.dist %>/README.md"],
        // delete generated index.html files from src/, but skip the root index.html
        src: ["<%= project.src %>/**/index.html", "!<%= project.src %>/index.html"]
      },

      shell: {
        deploy: {
          command: 'git subtree push --prefix <%= project.dist %> origin gh-pages'
        }
      },

      connect: {
        server: {
          options: {
            port: 9001,
            base: 'dist',
            open: true,
            keepalive: true
          }
        }
      }

    });

    grunt.registerTask('build', ['sass', 'clean:dist', 'convert', 'copy', 'clean:src']);

    grunt.registerTask('dev', ['watch']);

    grunt.registerTask('convert', function(){
      var posts = grunt.config('project.posts'),
          pages = grunt.config('project.pages'),
          postTpl = grunt.config('template.post'),
          masterTpl = grunt.config('template.master'),
          metadata = []; // metadata for posts archive

      grunt.file.expand([posts, pages]).forEach(function(file){
        var target = path.join(path.dirname(file), 'index.html'),
            isPost = grunt.file.isMatch(posts, file),
            html = marked(grunt.file.read(file)),
            // TODO extract title from filename as alternative
            title = getH1(html) || "Razvan Caliman",
            date  = getTime(html) || grunt.template.today('d mmmm yyyy');

        if (isPost){
            // posts get nested within an extra template
            html = postTpl({content: html});

            // collect metadata for archive
            metadata.push({
              title: title,
              date: date,
              url: target.substr('src/'.length)
            });
        }

        html = masterTpl({content: html, title: title});
        grunt.file.write(target, html);
      });

      // store for later
      grunt.config('archive', metadata);
    });

    // alternatively, you can manually run:
    // git subtree push --prefix dist origin gh-pages
    grunt.registerTask('deploy', ['shell:deploy']);
};
