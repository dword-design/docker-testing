FROM alekzonder/puppeteer:latest

USER root

RUN apt-get update
RUN apt-get install -y git graphviz

# Needed for tree-kill-promise
RUN apt-get install -y procps
