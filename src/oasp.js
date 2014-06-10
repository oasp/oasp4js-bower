angular.module('oasp-js', []).factory('oaspHello', [function () {
    "use strict";

    return {
        sayHelloTo : function (name) {
            return 'Hello ' + name;
        }
    };
}]);
