FROM dworddesign/alekzonder-puppeteer:latest

USER root

RUN apt-get update

# Puppeteer ##########################################################
RUN apt-get install -y xvfb

# dot ################################################################
RUN apt-get install -y git graphviz

# tree-kill-promise ##################################################
RUN apt-get install -y procps

# Emojis #############################################################

# https://itsfoss.com/add-apt-repository-command-not-found/
RUN apt-get install -y software-properties-common

# https://github.com/garris/BackstopJS/pull/1010/files
RUN apt-add-repository "deb http://deb.debian.org/debian testing main"

RUN apt-get update
RUN apt-get install -y fonts-noto-color-emoji