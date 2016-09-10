#!/bin/bash
# pack everything into an .xpi archive
zip -rq crush-those-cookies.xpi \
    content \
    bootstrap.js \
    chrome.manifest \
    install.rdf \
    AUTHORS \
    LICENSE