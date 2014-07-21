/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 2, maxerr: 50 */
/*global module, require */

var marked = require('marked'),
    path = require('path'),
    handlebars = require('handlebars');


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

    grunt.registerTask('build', ['sass', 'clean', 'convert', 'copy', 'clean:src']);

    grunt.registerTask('dev', ['watch']);

    grunt.registerTask('convert', function(){
      var posts = grunt.config('project.posts'),
          pages = grunt.config('project.pages'),
          postTpl = grunt.config('template.post'),
          masterTpl = grunt.config('template.master');

      grunt.file.expand([posts, pages]).forEach(function(file){
        var target = path.join(path.dirname(file), 'index.html'),
            md = grunt.file.read(file),
            html = marked(md),
            isPost = grunt.file.isMatch(posts, file);

        // posts get nested within an extra template
        if (isPost){
            html = postTpl({content: html});
        }

        html = masterTpl({content: html});

        grunt.file.write(target, html);
      });
    });

    // alternatively, you can manually run:
    // git subtree push --prefix dist origin gh-pages
    grunt.registerTask('deploy', ['shell:deploy']);
};
