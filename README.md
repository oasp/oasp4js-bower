oasp4js Extensions
==========

oasp4js extensions are [AngularJS](https://angularjs.org/) modules which address typical challenges in Single Page Applications (SPA), such as authentication and authorization (A&A), internationalization (i18n), etc. which are not directly addressed by AngularJS or other frameworks out of the box. These solutions are built on top of industry proven practices.

Getting Started
-----------------------

To get started you simply need to add `oasp` to your application's dependencies.

### 1. Install prerequisites
You need the Node.js platform (including its package manager - npm) which allows Bower to install the `oasp` dependency. Also, as Bower uses a Git client you need to install it too. [Here](https://github.com/oasp/oasp4js-app-template/wiki/Prerequisites) you can learn how to install the prerequisites.
     
### 2. Add oasp to your dependencies 
When you use Bower, you just need to go to your application's directory (where you have the ´bower.json´ file) and execute:

```bash
bower install https://github.com/oasp/oasp4js.git --save
```

Otherwise, go to the [distribution directory](https://github.com/oasp/oasp4js/tree/master/dist) and copy the files to your application. 

What oasp4js offers
-----------------------

`oasp4js` provides the following modules:

* oasp-security - a simple yet powerful solution to A&A in SPAs 
* oasp-i18n - addresses handling translations in SPAs 
* oasp-ui - a thin wrapper over [UI Bootstrap](http://angular-ui.github.io/bootstrap/) and [angular-spinner](https://github.com/urish/angular-spinner) which combines them making applications more responsive
* oasp-mocks - enables you to easy test your modules which depend on the other oasp4js modules 

Moreover, you can make use of `oasp4js` JavaScript coding conventions. 

For details, please refer to the [wiki](https://github.com/oasp/oasp4js/wiki). 