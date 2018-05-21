## Jobdone Frontend

Clone project with submodules
```
git clone --recurse-submodules -j8 git@github.com:scaltro/jobdone-fontend.git
```


## Install and Run

```
npm install
JOBDONE_DEV_KEY=SOMEDEVKEY npm run dev
```

JOBDONE_DEV_KEY -- backend developing key



## production update 

```
npm run build && pm2 restart web
```


## Prepare build for backend developers
1. generate build files
2. copy build file in jobdone-frontend-build submodule

```
npm run build
npm run prepare-build OUTPUT_DIRECTORY
```

OUTPUT_DIRECTORY should point to directory where assets and templates have been placed - normally this should point to directory where you've cloned `jobdone-frontend-build` repository