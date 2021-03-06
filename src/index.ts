import dotenv from 'dotenv';

import { server } from './webserver';
import { tokenValidation, pubSub } from './pubsub';

dotenv.config();

async function pubSubStart(): Promise<void> {
  // Loop while token is not validated yet
  await tokenValidation(3);
  await pubSub();
}

server.listen(process.env.PORT || 9000, () => {
  console.log(`listening on *:${process.env.PORT || 9000}`);
});

pubSubStart();
