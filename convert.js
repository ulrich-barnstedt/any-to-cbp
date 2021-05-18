const args = process.argv.slice(2);
const fs = require("fs");
const config = require("./config.json");
const exceptions = require("./stdExceptions.json");
const XMLJS = require("xml-js");
const baseXML = fs.readFileSync("./base.xml", "utf-8");
const {spawnSync} = require("child_process");

const log = (str, level) => {console.log(`[${new Date().toLocaleTimeString()}]${level ? ` [${level}]` : ""} ${str}`)}

class FileInvalid {
   static file (name) {
      return exceptions.files.find(str => str.toLowerCase() === name.toLowerCase()) !== undefined;
   }

   static folder (name) {
      return exceptions.folders.find(str => str.toLowerCase() === name.toLowerCase()) !== undefined;
   }
}

class DirTraverse {
   constructor (base) {
      this.mapped = base;
   }

   fileString (name) {
      return this.mapped.join("/") + ( this.mapped.length < 1 ? "" : "/" ) + name;
   }

   fsString () {
      return "/" + this.mapped.join("/");
   }

   extend (nw) {
      return [...this.mapped, nw];
   }

   complete (base) {
      return base + this.fsString() + (this.mapped.length < 1 ? "" : "/");
   }
}

class XMLMod {
   constructor (xml) {
      this.xml = xml;

      this.unitInsert = this.traversePath(config.unitsInsertion);
      this.nameSet = this.traversePath(config.namePath);
   }

   traversePath (pathArray) {
      let address = this.xml;

      pathArray.forEach(element => {
         address = address[element];
      })

      return address;
   }

   setName (name) {
      this.nameSet[config.nameAttribute] = name;
   }

   addUnit (filename) {
      if (!(config.units.tagName in this.unitInsert)) {
         this.unitInsert[config.units.tagName] = [];
      }

      let fileType = filename.split(".").pop().toLowerCase();
      let extraAttributes = fileType in config.units.typeOverwrites ? config.units.typeOverwrites[fileType] : {};

      this.unitInsert[config.units.tagName].push({_attributes : {[config.units.filenameProperty] : filename}, ...extraAttributes});
   }
}

class ZipHandler {
   static zip (files, cbp, outputPath, name) {
      const defaultArgs = ["a", "-tzip", outputPath + "/" + name + ".zip"];
      log("Generating zip file: " + defaultArgs[defaultArgs.length - 1], "INFO");

      files.forEach(file => {
         spawnSync(config.zip, [...defaultArgs, file], {cwd : outputPath});
      });

      spawnSync(config.zip, [...defaultArgs, cbp]);
   }
}

new class Parser {
   constructor () {
      console.log("Convert Tool: CL-CBP.ZIP <> v1.1, by Ox81")

      this.dir = args[0];
      this.name = args[1];
      this.cbpFile = config.tempDirectory + this.name + ".cbp";

      this.abstractMap = this.collectFiles();

      this.xml = this.getXMLLayout();
      this.xmlToTempDir();

      this.compressFiles();
      this.removeTempFile();

      log("Completed.", "SUCCESS")
   }

   collectFiles () {
      if (!this.dir) {
         throw "No directory provided.";
      }

      if (!fs.existsSync(this.dir)) {
         throw "Invalid path."
      }

      let mapped = [];
      const recursiveDirMap = (dirTraverser) => {
         let files = fs.readdirSync(dirTraverser.complete(this.dir), {withFileTypes : true});

         files.forEach(file => {
            if (file.isDirectory()) {
               if (FileInvalid.folder(file.name)) return;

               recursiveDirMap(new DirTraverse(dirTraverser.extend(file.name)));
               return;
            }

            if (FileInvalid.file(file.name)) return;
            mapped.push(dirTraverser.fileString(file.name));
         })
      }

      recursiveDirMap(new DirTraverse([]));

      log("Collected files: ", "INFO");
      for (let key in mapped) {
         log("\t\t" + mapped[key]);
      }

      return mapped;
   }

   getXMLLayout () {
      log(`Generating CBP File (project "${this.name}")`, "INFO");

      let xml = new XMLMod(XMLJS.xml2js(baseXML, {compact : true}));
      xml.setName(this.name);

      this.abstractMap.forEach(file => xml.addUnit(file));

      return XMLJS.js2xml(xml.xml, {compact : true});
   }

   xmlToTempDir () {
      fs.writeFileSync("." + this.cbpFile, this.xml);
   }

   removeTempFile () {
      log("Removing temporary files", "INFO");

      fs.unlinkSync("." + this.cbpFile);
   }

   compressFiles () {
      ZipHandler.zip(this.abstractMap, __dirname + this.cbpFile, this.dir, this.name);
   }
}()