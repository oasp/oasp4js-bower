# Packaged oasp4js AngularJS modules

This repository is for distribution on `bower`. The source for this module can be found in
[this repository](https://github.com/oasp/oasp4js).

## Install

### Instructions for installing ng-modules for OASP4JS Application Template

If you have already set up the [OASP4JS Application Template](https://github.com/oasp/generator-oasp) and you want to use OASP4JS ng-modules you have to perform steps listed below.

Install package using bower.

```shell
bower install oasp --save
``` 

The `save` parameter will add the package to the dependencies in the `bower.json` file. The OASP4JS Application Template uses [wiredep](https://github.com/taptapship/wiredep) which will automatically attach all needed scripts to the `index.html` file (including `oasp.min.js` needed here).

### Installation for other applications

If you are developing your own application without the OASP4JS Application Template and you are not using any plugins which will attach scripts automatically to your main html, please perform the following steps.

Install the package using `bower`:

```shell
bower install oasp
```
Then add a `<script>` to your `index.html`:

```html
<script src="/bower_components/oasp/oasp.min.js"></script>
```

## Documentation

Documentation of the ng-modules is available on the [Wiki](https://github.com/oasp/oasp4js/wiki/oasp4js-ng-modules).
