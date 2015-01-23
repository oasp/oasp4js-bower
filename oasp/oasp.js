angular.module('oasp', ['oasp.oaspUi', 'oasp.oaspSecurity', 'oasp.oaspI18n']);
angular.module('oasp.oaspSecurity', [])
    .config(["$httpProvider", function ($httpProvider) {
        'use strict';
        $httpProvider.interceptors.push('oaspSecurityInterceptor');
    }])
    .run(["oaspSecurityService", function (oaspSecurityService) {
        'use strict';
        oaspSecurityService.checkIfUserIsLoggedInAndIfSoReinitializeAppContext();
    }]);

angular.module('oasp.oaspSecurity')
    .factory('oaspSecurityInterceptor', ["$q", "oaspUnauthenticatedRequestResender", function ($q, oaspUnauthenticatedRequestResender) {
        'use strict';

        return {
            responseError: function (response) {
                var originalRequest;
                if (response.status === 403) {
                    originalRequest = response.config;
                    return oaspUnauthenticatedRequestResender.addRequest(originalRequest);
                }
                return $q.reject(response);
            }
        };
    }]);

angular.module('oasp.oaspSecurity')
    .provider('oaspSecurityService', function () {
        'use strict';
        var config = {
            securityRestServiceName: 'securityRestService',
            appContextServiceName: 'appContext'
        };

        return {
            setSecurityRestServiceName: function (securityRestServiceName) {
                config.securityRestServiceName = securityRestServiceName || config.securityRestServiceName;
            },
            setAppContextServiceName: function (appContextServiceName) {
                config.appContextServiceName = appContextServiceName || config.appContextServiceName;
            },
            $get: ["$injector", "$http", "$q", function ($injector, $http, $q) {
                var currentCsrfProtection = {
                        set: function (headerName, token) {
                            this.headerName = headerName;
                            this.token = token;
                        },
                        invalidate: function () {
                            this.headerName = undefined;
                            this.token = undefined;
                        }
                    },
                    currentCsrfProtectionWrapper = (function () {
                        return {
                            hasToken: function () {
                                return currentCsrfProtection.headerName && currentCsrfProtection.token ? true : false;
                            },
                            getHeaderName: function () {
                                return currentCsrfProtection.headerName;
                            },
                            getToken: function () {
                                return currentCsrfProtection.token;
                            }
                        };
                    }()),
                    currentUserProfileHandler = (function () {
                        var currentUserProfile,
                            profileBeingInitialized = false,
                            deferredUserProfileRetrieval;

                        return {
                            initializationStarts: function () {
                                profileBeingInitialized = true;
                                deferredUserProfileRetrieval = $q.defer();
                            },
                            initializationSucceeded: function (newUserProfile) {
                                currentUserProfile = newUserProfile;
                                profileBeingInitialized = false;
                                deferredUserProfileRetrieval.resolve(currentUserProfile);
                                deferredUserProfileRetrieval = undefined;
                            },
                            initializationFailed: function () {
                                currentUserProfile = undefined;
                                profileBeingInitialized = false;
                                deferredUserProfileRetrieval.resolve(currentUserProfile);
                                deferredUserProfileRetrieval = undefined;
                            },
                            userLoggedOff: function () {
                                currentUserProfile = undefined;
                            },
                            getProfile: function () {
                                return profileBeingInitialized ? deferredUserProfileRetrieval.promise : $q.when(currentUserProfile);
                            }
                        };
                    }()),
                    getSecurityRestService = function () {
                        return $injector.get(config.securityRestServiceName);
                    },
                    getAppContextService = function () {
                        return $injector.get(config.appContextServiceName);
                    },
                    enableCsrfProtection = function () {
                        return getSecurityRestService().getCsrfToken()
                            .then(function (response) {
                                var csrfProtection = response.data;
                                // from now on a CSRF token will be added to all HTTP requests
                                $http.defaults.headers.common[csrfProtection.headerName] = csrfProtection.token;
                                currentCsrfProtection.set(csrfProtection.headerName, csrfProtection.token);
                                return csrfProtection;
                            }, function () {
                                return $q.reject('Requesting a CSRF token failed');
                            });
                    };

                return {
                    logIn: function (username, password) {
                        var logInDeferred = $q.defer();
                        currentUserProfileHandler.initializationStarts();
                        getSecurityRestService().login(username, password)
                            .then(function () {
                                $q.all([
                                    getSecurityRestService().getCurrentUser(),
                                    enableCsrfProtection()
                                ]).then(function (allResults) {
                                    var userProfile = allResults[0].data;
                                    currentUserProfileHandler.initializationSucceeded(userProfile);
                                    getAppContextService().onLoggingIn(userProfile);
                                    logInDeferred.resolve();
                                }, function (reject) {
                                    currentUserProfileHandler.initializationFailed();
                                    logInDeferred.reject(reject);
                                });
                            }, function () {
                                currentUserProfileHandler.initializationFailed();
                                logInDeferred.reject('Authentication failed');
                            });
                        return logInDeferred.promise;
                    },
                    logOff: function () {
                        return getSecurityRestService().logout()
                            .then(function () {
                                currentCsrfProtection.invalidate();
                                currentUserProfileHandler.userLoggedOff();
                                getAppContextService().onLoggingOff();
                            });
                    },
                    checkIfUserIsLoggedInAndIfSoReinitializeAppContext: function () {
                        currentUserProfileHandler.initializationStarts();
                        getSecurityRestService().getCurrentUser()
                            .then(function (response) {
                                var userProfile = response.data;
                                enableCsrfProtection().then(function () {
                                    currentUserProfileHandler.initializationSucceeded(userProfile);
                                    getAppContextService().onLoggingIn(userProfile);
                                }, function () {
                                    currentUserProfileHandler.initializationFailed();
                                });
                            }, function () {
                                currentUserProfileHandler.initializationFailed();
                            });
                    },
                    getCurrentCsrfToken: function () {
                        return currentCsrfProtectionWrapper;
                    },
                    getCurrentUserProfile: function () {
                        return currentUserProfileHandler.getProfile();
                    }
                };
            }]
        };
    });
angular.module('oasp.oaspSecurity')
    .provider('oaspUnauthenticatedRequestResender', function () {
        'use strict';
        var config = {
            authenticatorServiceName: 'authenticator'
        };

        return {
            setAuthenticatorServiceName: function (authenticatorServiceName) {
                config.authenticatorServiceName = authenticatorServiceName || config.authenticatorServiceName;
            },
            $get: ["$q", "$injector", function ($q, $injector) {
                var requestQueue = {
                        queue: [],
                        push: function (requestToResend) {
                            this.queue.push(requestToResend);
                        },
                        resendAll: function (csrfProtection) {
                            while (this.queue.length) {
                                this.queue.shift().resend(csrfProtection);
                            }
                        },
                        cancelAll: function () {
                            while (this.queue.length) {
                                this.queue.shift().cancel();
                            }
                        }
                    },
                    getOaspSecurityService = function () {
                        return $injector.get('oaspSecurityService');
                    },
                    getAuthenticator = function () {
                        return $injector.get(config.authenticatorServiceName);
                    },
                    authenticate = (function () {
                        var authenticatorNotCalledYet = true;

                        return function (successCallbackFn, failureCallbackFn) {
                            if (authenticatorNotCalledYet) {
                                getAuthenticator().execute()
                                    .then(function () {
                                        successCallbackFn();
                                        authenticatorNotCalledYet = true;
                                    }, function () {
                                        failureCallbackFn();
                                        authenticatorNotCalledYet = true;
                                    });
                                authenticatorNotCalledYet = false;
                            }
                        };
                    }());

                return {
                    addRequest: function (request) {
                        var deferredRetry = $q.defer(),
                            requestToResend = {
                                resend: function (csrfProtection) {
                                    var resendRequestUpdatingItsCsrfProtectionData =
                                        function (request, csrfProtection) {
                                            var $http = $injector.get('$http');
                                            request.headers[csrfProtection.headerName] = csrfProtection.token;
                                            return $http(request);
                                        };

                                    resendRequestUpdatingItsCsrfProtectionData(request, csrfProtection)
                                        .then(function (value) {
                                            deferredRetry.resolve(value);
                                        }, function (value) {
                                            deferredRetry.reject(value);
                                        });
                                },
                                cancel: function () {
                                    deferredRetry.reject();
                                }
                            },
                            resendAllAwaitingRequestsOnSuccess = function () {
                                var currentCsrfToken = getOaspSecurityService().getCurrentCsrfToken();

                                requestQueue.resendAll({
                                    headerName: currentCsrfToken.getHeaderName(),
                                    token: currentCsrfToken.getToken()
                                });
                            },
                            cancelAllAwaitingRequestsOnFailure = function () {
                                requestQueue.cancelAll();
                            };

                        requestQueue.push(requestToResend);
                        authenticate(resendAllAwaitingRequestsOnSuccess, cancelAllAwaitingRequestsOnFailure);
                        return deferredRetry.promise;
                    }
                };
            }]
        };
    });

angular.module('oasp.oaspUi.buttonBar', ['oasp.oaspUi.templates']);

/*global TrNgGrid*/
angular.module('oasp.oaspUi.oaspGrid', ['oasp.oaspUi.templates', 'trNgGrid']).run(function () {
    'use strict';
    TrNgGrid.tableCssClass = 'tr-ng-grid table table-striped';
});

angular.module('oasp.oaspUi.modal', ['oasp.oaspUi.spinner', 'ui.bootstrap.modal', 'oasp.oaspUi.templates']);

angular.module('oasp.oaspUi.spinner', ['angularSpinner', 'oasp.oaspUi.templates']);

angular.module('oasp.oaspUi', ['oasp.oaspUi.oaspGrid', 'oasp.oaspUi.spinner', 'oasp.oaspUi.modal', 'oasp.oaspUi.buttonBar']);

angular.module('oasp.oaspUi.buttonBar')
    .directive('buttonBar', function () {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'oasp/oasp-ui/html/button-bar/button-bar.html',
            scope: {
                buttonDefs: '='
            },
            link: function ($scope) {
                $scope.onButtonClick = function (buttonDef) {
                    if (buttonDef && angular.isFunction(buttonDef.onClick)) {
                        buttonDef.onClick.apply(undefined, arguments);
                    }
                };
                $scope.isButtonDisabled = function (buttonDef) {
                    if (buttonDef && angular.isFunction(buttonDef.isActive)) {
                        return !buttonDef.isActive.apply(undefined, arguments);
                    }
                    if (buttonDef && angular.isFunction(buttonDef.isNotActive)) {
                        return buttonDef.isNotActive.apply(undefined, arguments);
                    }
                    return true;
                };
            }
        };
    });

angular.module('oasp.oaspUi.modal')
    .constant('oaspUiModalDefaults', {
        backdrop: 'static',
        keyboard: false
    })
    .config(["$provide", "oaspUiModalDefaults", function ($provide, oaspUiModalDefaults) {
        'use strict';
        var $modalDecorator = function ($delegate, globalSpinner) {
            return {
                open: function (options) {
                    globalSpinner.show();
                    var result = $delegate.open(angular.extend({}, oaspUiModalDefaults, options));
                    result.opened
                        .then(function () {
                            globalSpinner.hide();
                        }, function () {
                            globalSpinner.hide();
                        });
                    return result;
                }
            };
        };
        $modalDecorator.$inject = ["$delegate", "globalSpinner"];
        $provide.decorator('$modal', $modalDecorator);
    }]);
angular.module('oasp.oaspUi.spinner')
    .factory('globalSpinner', ["$rootScope", "$q", function ($rootScope, $q) {
        'use strict';
        var that = {};
        that.show = function () {
            $rootScope.globalSpinner = true;
        };
        that.hide = function () {
            $rootScope.globalSpinner = false;
        };
        that.showOnRouteChangeStartAndHideWhenComplete = function () {
            /*jslint unparam: true*/
            $rootScope.$on('$routeChangeStart', function (event, currentRoute) {
                if (currentRoute.resolve) {
                    that.show();
                }
            });
            /*jslint unparam: false*/
            $rootScope.$on('$routeChangeSuccess', function () {
                that.hide();
            });
            $rootScope.$on('$routeChangeError', function () {
                that.hide();
            });
        };
        that.decorateCallOfFunctionReturningPromise = function (fn) {
            that.show();
            return fn().then(function (value) {
                that.hide();
                return value;
            }, function (value) {
                that.hide();
                return $q.reject(value);
            });
        };

        return that;
    }]);
angular.module('oasp.oaspUi.spinner')
    .constant('spinnerOptions', {
        lines: 13,
        length: 20,
        width: 4,
        radius: 16,
        corners: 1,
        rotate: 0,
        color: '#ffffff',
        speed: 1.2,
        trail: 54,
        shadow: false,
        hwaccel: false,
        zIndex: 2e9
    })
    .directive('spinner', ["spinnerOptions", function (spinnerOptions) {
        'use strict';

        return {
            restrict: 'A',
            replace: true,
            templateUrl: 'oasp/oasp-ui/html/spinner/spinner.html',
            scope: {
                spinnerVisible: '=spinner'
            },
            link: function (scope) {
                scope.spinnerOptions = spinnerOptions;
            }
        };
    }]);

angular.module("oasp.oaspUi.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("oasp/oasp-ui/html/button-bar/button-bar.html","<div class=\"btn-group btn-group-sm\" role=\"group\"><button data-ng-repeat=\"buttonDef in buttonDefs\" data-ng-click=\"onButtonClick(buttonDef)\" data-ng-disabled=\"isButtonDisabled(buttonDef)\" class=\"btn btn-sm btn-default\"><span data-ng-bind=\"buttonDef.label\"></span></button></div>");
$templateCache.put("oasp/oasp-ui/html/spinner/spinner.html","<div class=\"spinner-container\" data-ng-show=\"spinnerVisible\"><div class=\"spinner-backdrop\"></div><span us-spinner=\"spinnerOptions\" data-spinner-start-active=\"1\"></span></div>");}]);
angular.module('oasp.oaspI18n', ['pascalprecht.translate', 'oasp.oaspI18n.templates'], ["$translateProvider", "$httpProvider", function ($translateProvider, $httpProvider) {
    'use strict';
    $httpProvider.interceptors.push('templateLoadTranslationInterceptor');
    $translateProvider.useLoader('$translatePartialLoader', {
        urlTemplate: '{part}/i18n/locale-{lang}.json'
    });
}]).run(["$rootScope", "$translate", "$translatePartialLoader", function ($rootScope, $translate, $translatePartialLoader) {
    'use strict';
    var switchPart = function (part) {
        $translatePartialLoader.addPart(part);
        $translate.refresh();
    };
    $rootScope.$on('translationPartChange', function (event, part) {
        switchPart(part, event);
    });
}]);


angular.module('oasp.oaspI18n').provider('oaspTranslation', ["$translatePartialLoaderProvider", "$translateProvider", function ($translatePartialLoaderProvider, $translateProvider) {
    'use strict';

    var modulesWithTranslations = [],
        defaultModule,
        supportedLanguages = [],
        getDefaultLanguage = function () {
            var i, defaultLanguage;
            if (supportedLanguages && supportedLanguages.length) {
                defaultLanguage = supportedLanguages[0];
                for (i = 0; i < supportedLanguages.length; i += 1) {
                    if (supportedLanguages[i].default === true) {
                        defaultLanguage = supportedLanguages[i];
                    }
                }
            }
            return defaultLanguage;
        };

    this.enableTranslationForModule = function (module, isDefault) {
        if (modulesWithTranslations.indexOf(module) < 0) {
            modulesWithTranslations.push(module);
        }
        if (isDefault === true) {
            if (defaultModule) {
                throw new Error('Default module already specified defaultModule=' + defaultModule);
            }
            defaultModule = module;
            $translatePartialLoaderProvider.addPart(defaultModule);
        }
    };

    this.setSupportedLanguages = function (langs) {
        if (supportedLanguages && supportedLanguages.length) {
            throw new Error('Supported languages already specified');
        }
        supportedLanguages = langs;
        if (getDefaultLanguage()) {
            $translateProvider.preferredLanguage(getDefaultLanguage().key);
        }
    };

    this.$get = [function () {
        return {
            moduleHasTranslations: function (module) {
                return modulesWithTranslations.indexOf(module) > -1;
            },
            getDefaultTranslationModule: function () {
                return defaultModule;
            },
            getSupportedLanguages: function () {
                return supportedLanguages;
            },
            getDefaultLanguage: getDefaultLanguage
        };
    }];
}]);
angular.module('oasp.oaspI18n').service('templateLoadTranslationInterceptor', ["$rootScope", "oaspTranslation", function ($rootScope, oaspTranslation) {
    'use strict';
    var regexp = new RegExp('/?([^/]+)/html/');
    return {
        'request': function (config) {
            if (config.url) {
                var matches = regexp.exec(config.url);
                if (matches && matches.length > 1 && oaspTranslation.moduleHasTranslations(matches[1])) {
                    $rootScope.$emit('translationPartChange', matches[1]);
                }
            }
            return config;
        }
    };
}]);

angular.module('oasp.oaspI18n').controller('LanguageChangeCntl', ["$scope", "$translate", "oaspTranslation", function ($scope, $translate, oaspTranslation) {
    'use strict';
    $scope.supportedLanguages = oaspTranslation.getSupportedLanguages();

    $scope.changeLanguage = function (lang) {
        $translate.use(lang);
    };
    $scope.getCurrentLanguage = function () {
        return $translate.use();
    };
}]);
angular.module('oasp.oaspI18n').directive('languageChange', function () {
    'use strict';
    return {
        restrict: 'EA',
        scope: true,
        replace: true,
        controller: 'LanguageChangeCntl',
        templateUrl: 'oasp/oasp-i18n/html/language-change.html'
    };
});

angular.module("oasp.oaspI18n.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("oasp/oasp-i18n/html/language-change.html","<li class=\"dropdown language-dropdown\" dropdown=\"\"><a href=\"\" class=\"dropdown-toggle\" dropdown-toggle=\"\"><span class=\"icon-container\"><span class=\"icon icon-{{getCurrentLanguage()}}-24\"></span></span><span translate=\"\">OASP.LANGUAGE</span><span class=\"caret\"></span></a><ul class=\"dropdown-menu\" role=\"menu\"><li ng-repeat=\"lang in supportedLanguages\" ng-show=\"getCurrentLanguage()!=lang.key\"><a ng-click=\"changeLanguage(lang.key)\"><span class=\"icon icon-{{lang.key}}-24\"></span>{{lang.label}}</a></li></ul></li>");}]);