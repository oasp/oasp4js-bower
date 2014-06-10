module.exports = function (grunt) {
    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);
    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    grunt.initConfig({
        config: require('./config.json'),
        uglify: {
            dist: {
                files: {
                    '<%= config.dist %>/oasp.min.js': ['<%= config.src %>/oasp.js']
                }
            }
        },
        // Empties folders to start fresh
        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [
                            '<%= config.dist %>/{,*/}*'
                        ]
                    }
                ]
            }}
    });

    grunt.registerTask('build', [
        'clean', 'uglify'
    ]);
};