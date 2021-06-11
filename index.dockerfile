FROM dworddesign/alekzonder-puppeteer:latest

USER root

RUN apt-get update

# Puppeteer
RUN apt-get install -y xvfb

# dot
RUN apt-get install -y git graphviz

# tree-kill-promise
RUN apt-get install -y procps
