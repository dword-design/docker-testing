FROM node:16-slim

######################################################################

# Puppeteer
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_CACHE_DIR=/app/node_modules/.cache/puppeteer

######################################################################

RUN apt-get update

# Headful Puppeteer ##################################################

RUN apt-get install -y xvfb

# dot ################################################################

RUN apt-get install -y git graphviz

# tree-kill-promise ##################################################

RUN apt-get install -y procps

# Emojis #############################################################

RUN apt-get install -y fonts-noto-color-emoji

## Git ###############################################################

# Otherwise we get this error due to permission conflicts between host and container:
#
# fatal: detected dubious ownership in repository at '/app'
# To add an exception for this directory, call:
# 
#   git config --global --add safe.directory /app
RUN git config --global --add safe.directory /app

######################################################################

WORKDIR /app
