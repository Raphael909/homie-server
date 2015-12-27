'use strict';

const port = 35589;

import path from 'path';
import mosca from 'mosca';

import Server from './server';
import parser from '../mqtt-parser';
import config from '../config';
import log from '../log';

class HomieServer extends Server {
  constructor () {
    super('Homie');
  }

  start () {
    this.moscaInstance = new mosca.Server({
      port: port,
      persistence: {
        factory: mosca.persistence.LevelUp,
        path: path.join(config.dataDir, '/db/broker.db')
      }
    });

    this.moscaInstance.on('clientConnected', (client) => {
      log.debug(`${client.id} connected to MQTT`);
    });

    this.moscaInstance.on('clientDisconnected', (client) => {
      log.debug(`${client.id} disconnected from MQTT`);
    });

    this.moscaInstance.authorizePublish = function (client, topic, payload, cb) {
      if (!parser.parse(topic, payload.toString())) { // if invalid homie message, reject it
        return cb(null, false);
      }

      cb(null, true);
    };

    this.moscaInstance.authorizeSubscribe = function (client, topic, cb) {
      // anyone can subscribe to anything
      cb(null, true);
    };

    this.moscaInstance.on('published', (packet, client) => {
      if (packet.topic.startsWith('$SYS')) {
        return;
      }

      this.emit('message', packet.topic, packet.payload.toString());
    });

    this.moscaInstance.on('ready', () => {
      this.emit('ready', { host: '', port: port });
    });
  }

  publish (packet) {
    this.moscaInstance.publish(packet, function () {});
  }
}

export default new HomieServer();