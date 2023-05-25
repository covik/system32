FROM mysql:8
ARG uid
ARG gid
RUN groupmod --gid=$gid mysql && usermod --uid=$uid mysql
RUN chown -R mysql:mysql /var/lib/{mysql,mysql-files,mysql-keyring} /var/run/mysqld
