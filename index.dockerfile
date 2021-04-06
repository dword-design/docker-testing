FROM alekzonder/puppeteer:latest

USER root

RUN apt-get update
RUN apt-get install git -y

# Needed for tree-kill-promise
RUN apt-get install procps -y
