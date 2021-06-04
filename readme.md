## any-to-cbp

A small script to convert C/C++ source files to a code blocks project, 
automatically zip compressed.

#### Installation

- Clone this repository
- Open the folder in a terminal
- Run `npm install`
- Make sure you have 7zip installed and change the path in `config.json` to
  point to your 7-Zip executable
- If you need to ignore any directories (...build directories, IDE config files, ...)
  that shouldn't be added, add them to `stdExceptions.json`
  
#### Usage

- Open terminal
- Set the working directory either manually or automatically to this repo
- `node convert.js <Target project directory> <Project name>`
- You should see a new .zip file in the project directory containing the finished
  files.
  