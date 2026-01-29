import {
  Writer,
  Reader,
  Connection,
  SchemaRegistry,
  SCHEMA_TYPE_JSON,
} from "k6/x/kafka";
import { check } from "k6";

const brokers = ["localhost:9092"];
const topic = "ticket_bookings";

const writer = new Writer({
  brokers: brokers,
  topic: topic,
  autoCreateTopic: true,
});

export const options = {
  stages: [
    { duration: "10s", target: 10 },  // Ramp up to 10 VUs
    { duration: "30s", target: 50 },  // Ramp up to 50 VUs
    { duration: "1m", target: 100 },  // Ramp up to 100 VUs
    { duration: "1m", target: 100 },  // Stay at 100 VUs
    { duration: "10s", target: 0 },   // Ramp down
  ],
  thresholds: {
    kafka_writer_error_count: ["count<100"],
  },
};

export default function () {
  const messages = [
    {
      key: JSON.stringify({
        correlationId: `test-${Date.now()}-${__VU}-${__ITER}`,
      }),
      value: JSON.stringify({
        seat_id: Math.floor(Math.random() * 100) + 1,
        user_id: Math.floor(Math.random() * 1000) + 1,
        status: "reserved",
      }),
      headers: {
        "test-id": `vu-${__VU}-iter-${__ITER}`,
      },
    },
  ];

  const error = writer.produce({ messages: messages });
  check(error, {
    "message sent successfully": (err) => err == undefined,
  });
}

export function teardown(data) {
  writer.close();
}

