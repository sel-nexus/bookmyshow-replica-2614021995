import { createApp } from './app';
import { config } from './config';

/** Start the API after module initialization has applied migrations. */
function startServer(): void {
  createApp().listen(config.port, (): void => {
    console.info(`API listening on port ${config.port}`);
  });
}

startServer();
