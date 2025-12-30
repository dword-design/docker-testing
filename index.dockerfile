FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Corepack ###########################################################

RUN corepack enable

# pnpm ###############################################################

RUN pnpm config set store-dir /pnpm/store

# apt-get update #####################################################

RUN apt-get update

# Playwright #########################################################

ENV PLAYWRIGHT_BROWSERS_PATH=0

# dot ################################################################

RUN apt-get install -y graphviz

# tree-kill-promise ##################################################

RUN apt-get install -y procps

# Emojis #############################################################

RUN apt-get install -y fonts-noto-color-emoji

## Git ###############################################################

RUN apt-get install -y git

# Otherwise we get this error due to permission conflicts between host and container:
#
# fatal: detected dubious ownership in repository at '/app'
# To add an exception for this directory, call:
# 
#   git config --global --add safe.directory /app
RUN git config --global --add safe.directory /app

## Java (for Firebase Extensions Emulator) ###########################

RUN apt-get install -y openjdk-17-jre

######################################################################

WORKDIR /app
