module.exports = function (grunt) {
    'use strict';
    var _ = require('lodash');

    grunt.mergeConfig({
        html2js: _.merge(
            grunt.config().config.tasks.html2js(),
            {
                options: {
                    module: function (path, taskName) {
                        var toCamel = function (str) {
                            return str.replace(/-([a-z])/g, function (g) {
                                return g[1].toUpperCase();
                            });
                        };
                        return 'oasp.' + toCamel(taskName) + '.templates';
                    },
                    singleModule: true,
                    rename: function (moduleName) {
                        return moduleName
                            .replace('../' + grunt.config().config.paths.tmp + '/', '')
                            .replace('cached/', '');
                    }
                }
            }
        )
    });

};
