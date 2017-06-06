# Microsoft MakeCode (Embedded Learning Extension)

## Overview
This extension builds on top of the following open source projects:
- Microsoft MakeCode is based on the open source project [Microsoft Programming Experience Toolkit (PXT)](https://github.com/Microsoft/pxt). ``Microsoft MakeCode`` is the name in the user-facing editors, ``PXT`` is used in all the GitHub sources.
- Embedded Learning Library (ELL) is an open source project for building and deploying machine-learned pipelines onto resource-constrained embedded platforms.

This extension adds a new tab to the MakeCode app for targets such as the BBC Microbit or Adafruit's Circuit Playground and allows children to go through all of the required steps to build a new gesture recognizer block. The main added (work-in-progress) features are:
* An understandable visualization of sensor data and signals
* An approachable user-experience for beginners to train and label their own gestures
* Different methods for sensor data acquisition and labeling
* Generate MakeCode blocks that will fire an event whenever the trained gesture was recognized 

## Setting up the build environment
Make sure that you have access to an Adafruit's [Circuit Playground](https://www.adafruit.com/product/3333) that is programmed with the latests [firmware](#).

First, install [Node](https://nodejs.org/en/): minimum version 5.7. Then install the following:
```
npm install -g jake
npm install -g typings
```

Then start by cloning pxt, pxt-common-packages, and pxt-adafruit (currently private) in the same folder:
```
git clone https://github.com/myjeeed/pxt.git
```
```
git clone https://github.com/Microsoft/pxt-common-packages.git
```
```
git clone https://github.com/Microsoft/pxt-adafruit.git
```

At this point, you will have these three folders in the same directory: pxt, pxt-common-packages, and pxt-adafruit


## Linking a target to PXT
```
cd pxt-adafruit
```
```
npm link ../pxt
```
```
npm link ../pxt-common-packages
```
```
cd pxt-common-packages
```
```
npm link ../pxt
```


## Build and run
```
cd pxt
```
```
npm install
typings install
jake
```
```
cd pxt-adafruit
```
```
npm install
```
```
cd pxt-common-packages
```
```
npm install
```

Then install the `pxt` command line tool (only need to do it once):

```
npm install -g pxt
```

After this you can run `pxt` from anywhere within the build tree.

To start the local web server, run `pxt serve --cloud` from within the root
of an app target (e.g. pxt-adafruit). PXT will open the editor in your default web browser.


## Tests

The tests are located in the `tests/` subdirectory and are a combination of node and
browser tests. To execute them, run `jake test` in the root directory.

## License

MIT

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.