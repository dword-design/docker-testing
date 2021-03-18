FROM alekzonder/puppeteer:latest

USER root

RUN apt-get update && apt-get install git -y
