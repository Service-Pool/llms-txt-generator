FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash git openssh-client docker.io supervisor python3 python3-pip gosu \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --break-system-packages multivisor[rpc] \
    && mkdir -p /var/log/supervisor /var/run/supervisor /run /app/node_modules /home/www-data \
    && chmod -R 777 /var/log/supervisor /var/run/supervisor /run

COPY _configs/supervisord-app.conf /etc/supervisord.conf

EXPOSE 3301

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash", "/tmp/app/cmd-llms-txt-generator-ui.sh"]
