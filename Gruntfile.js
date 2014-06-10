/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 2, maxerr: 50 */
/*global module, require */

module.exports = function (grunt) {

    'use strict';

    // load all grunt plugins defined in package.json
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

      pkg: grunt.file.readJSON("package.json"),

      // configurable paths
      project: {
        src: 'src',
        dist: 'dist'
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
            '<%= project.src %>/css/screen.css': '<%= project.src %>/sass/screen.scss'
          }
        }
      },

      copy: {
        main: {
          files: [{expand: true, cwd: '<%= project.src %>', src: ['**'], dest: '<%= project.dist %>'}]
        }
      },

      // Deletes all files under dist/, but skips dist/README.md
      clean: {
        dist: ["<%= project.dist %>/*", "!<%= project.dist %>/README.md"]
      },

      shell: {
        deploy: {
          command: 'git subtree push --prefix <%= project.dist %> origin gh-pages'
        }
      }

    });

    // `copy` task MUST run before `requirejs` because the latter overwrites `dist/js/main.js`
    grunt.registerTask('build', ['sass', 'clean', 'copy']);

    grunt.registerTask('dev', ['watch']);

    // alternatively, you can manually run:
    // git subtree push --prefix dist origin gh-pages
    grunt.registerTask('deploy', ['shell:deploy']);
};
