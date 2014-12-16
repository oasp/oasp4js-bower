module.exports = (function () {
    'use strict';
    var grunt = require('grunt'), $s = require('string'),
        paths = {
            tmp: ".tmp",
            dist: "dist",
            app: "app",
            test: "test"
        },
        modules = [
            'oasp-security',
            'oasp-ui',
            'oasp-i18n'
        ],
        builder = (function () {
            return {
                build: function (path, module) {
                    return $s(path)
                        .replaceAll('{module}', module)
                        .replaceAll('{app}', paths.app)
                        .replaceAll('{tmp}', paths.tmp)
                        .replaceAll('{test}', paths.test)
                        .replaceAll('{dest}', paths.dest).s;
                },
                buildForModules: function (patterns) {
                    var i, j, result = [];
                    for (i = 0; i < modules.length; i += 1) {
                        for (j = 0; j < arguments.length; j++) {
                            result.push(builder.build(arguments[j], modules[i]));
                        }
                    }
                    return result;
                }
            };
        }());
    return {
        context: "oasp4j-example-application",
        paths: paths,
        //generating configuration for particular tasks
        tasks: {
            less: function () {
                return builder.buildForModules('{app}/{module}/css/{module}.less');
            },
            copyless: function () {
                return builder.buildForModules('{module}/css/**/*.less');
            },
            i18n: function () {
                return builder.buildForModules('{module}/i18n/**/*.json');
            },
            img: function () {
                return builder.buildForModules('{module}/img/**');
            },
            html2js: function () {
                var ngTempaltesPaths = {}, i, tempSrcPath, srcPath;
                for (i = 0; i < modules.length; i += 1) {
                    tempSrcPath = builder.build('{tmp}/{module}/html/cached', modules[i]);
                    srcPath = builder.build('{app}/{module}/html/cached', modules[i]);
                    if (grunt.file.isDir(srcPath)) {
                        ngTempaltesPaths[modules[i]] = {
                            src: tempSrcPath + '/**/*.html',
                            dest: builder.build('{tmp}/{module}/js/{module}.templates.js', modules[i])
                        };
                    }
                }
                return ngTempaltesPaths;
            },
            sprite: function () {
                var spriteConf = {}, i, srcPath;
                for (i = 0; i < modules.length; i += 1) {
                    srcPath = builder.build('{app}/{module}/img/sprite', modules[i]);
                    if (grunt.file.isDir(srcPath)) {
                        spriteConf[modules[i]] = {
                            src: srcPath + '/**/*.png',
                            destImg: builder.build('{tmp}/{module}/img/{module}-icons.png', modules[i]),
                            destCSS: builder.build('{tmp}/{module}/css/{module}-icons.css', modules[i]),
                            engine: 'pngsmith',
                            cssFormat: 'css'
                        };
                    }
                }
                return spriteConf;
            },
            karma: {
                sources: function () {
                    var sourcesPatterns = [], i;
                    sourcesPatterns.push(builder.build('{app}/app.module.js'));
                    for (i = 0; i < modules.length; i += 1) {
                        sourcesPatterns.push(builder.build('{app}/{module}/js/**/*.module.js', modules[i]));
                        sourcesPatterns.push(builder.build('{app}/{module}/js/**/!(*spec|*mock).js', modules[i]));
                        sourcesPatterns.push(builder.build('{tmp}/{module}/js/**/*.js', modules[i]));
                    }
                    return sourcesPatterns;
                },
                testSources: function () {
                    var sourcesPatterns = [], i;
                    for (i = 0; i < modules.length; i += 1) {
                        sourcesPatterns.push(builder.build('{app}/{module}/js/**/*.mock.js', modules[i]));
                    }
                    for (i = 0; i < modules.length; i += 1) {
                        sourcesPatterns.push(builder.build('{app}/{module}/js/**/*.spec.js', modules[i]));
                    }
                    return sourcesPatterns;
                }
            },
            script: {
                sources: function () {
                    return [builder.build('{app}/*.module.js')].concat(builder.buildForModules(
                        '{app}/{module}/js/**/*.module.js',
                        '{app}/{module}/js/**/*.js',
                        '{tmp}/{module}/js/**/*.js'
                    ), ['!**/*spec.js', '!**/*mock.js']);
                }
            },
            html: {
                sources: function () {
                    return builder.buildForModules('{module}/html/**/*.html');
                },
                scriptSources: function () {
                    var sourcesPatterns = [], i;
                    sourcesPatterns.push(builder.build('app.module.js'));
                    for (i = 0; i < modules.length; i += 1) {
                        sourcesPatterns.push(builder.build('{module}/js/**/*.module.js', modules[i]));
                        sourcesPatterns.push(builder.build('{module}/js/**/*.js', modules[i]));
                    }
                    sourcesPatterns.push(builder.build('!**/*spec.js', modules[i]));
                    sourcesPatterns.push(builder.build('!**/*mock.js', modules[i]));
                    return {
                        cwd: paths.app,
                        files: sourcesPatterns
                    };
                },
                generatedScriptSources: function () {
                    var sourcesPatterns = [], i;
                    for (i = 0; i < modules.length; i += 1) {
                        sourcesPatterns.push(builder.build('{module}/js/**/*.js', modules[i]));
                    }
                    return {
                        cwd: paths.tmp,
                        files: sourcesPatterns
                    };
                }
            }
        }
    };
}());
