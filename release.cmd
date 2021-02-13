@echo off
set VER=2.9.8

sed -i -E "s/version>.+?</version>%VER%</" install.rdf
sed -i -E "s/version>.+?</version>%VER%</; s/download\/.+?\/cookexterm-.+?\.xpi/download\/%VER%\/cookexterm-%VER%\.xpi/" update.xml

set XPI=cookexterm-%VER%.xpi
if exist %XPI% del %XPI%
zip -r9q %XPI% * -x .git/* .gitignore update.xml LICENSE README.md *.cmd *.xpi *.exe
