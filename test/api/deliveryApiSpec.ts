/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require("frisby");
import { expect } from "@jest/globals";
import config from "config";

const API_URL = "http://localhost:3000/api";
const REST_URL = "http://localhost:3000/rest";

const jsonHeader = { "content-type": "application/json" };
let authHeader: { Authorization: string; "content-type": string };
const loginAndGetAuthHeader = async (email: string, password: string) => {
  return frisby
    .post(REST_URL + "/user/login", {
      headers: jsonHeader,
      body: {
        email: email,
        password: password
      }
    })
    .expect("status", 200)
    .then(({ json }) => {
      return { Authorization: "Bearer " + json.authentication.token, "content-type": "application/json" };
    });
};

describe("/api/Deliverys", () => {
  let authHeader: any;

  const loginAndSetAuthHeader = async (email: string, password: string) => {
    authHeader = await loginAndGetAuthHeader(email, password);
  };

  const testDeliveryMethods = (expectedPrice: number) => {
    return frisby
      .get(API_URL + "/Deliverys", { headers: authHeader })
      .expect("status", 200)
      .expect("header", "content-type", /application\/json/)
      .then(({ json }) => {
        expect(json.data.length).toBe(3);
        expect(json.data[0].id).toBe(1);
        expect(json.data[0].name).toBe("One Day Delivery");
        expect(json.data[0].price).toBe(expectedPrice);
        expect(json.data[0].eta).toBe(1);
      });
  };

  describe("for regular customer", () => {
    beforeAll(async () => {
      const email = "jim@" + config.get<string>("application.domain");
      const password = "ncc-1701";
      await loginAndSetAuthHeader(email, password);
    });

    it("GET delivery methods", () => {
      return testDeliveryMethods(0.99);
    });
  });

  describe("for deluxe customer", () => {
    beforeAll(async () => {
      const email = "ciso@" + config.get<string>("application.domain");
      const password = "mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb";
      await loginAndSetAuthHeader(email, password);
    });

    it("GET delivery methods", () => {
      return testDeliveryMethods(0.5);
    });
  });
});

describe("/api/Deliverys/:id", () => {
  let authHeader: any;

  const loginAndSetAuthHeader = async (email: string, password: string) => {
    authHeader = await loginAndGetAuthHeader(email, password);
  };

  const testDeliveryMethodById = (expectedPrice: number) => {
    return frisby
      .get(API_URL + "/Deliverys/2", { headers: authHeader })
      .expect("status", 200)
      .expect("header", "content-type", /application\/json/)
      .then(({ json }) => {
        expect(json.data.id).toBe(2);
        expect(json.data.name).toBe("Fast Delivery");
        expect(json.data.price).toBe(expectedPrice);
        expect(json.data.eta).toBe(3);
      });
  };

  describe("for regular customer", () => {
    beforeAll(async () => {
      const email = "jim@" + config.get<string>("application.domain");
      const password = "ncc-1701";
      await loginAndSetAuthHeader(email, password);
    });

    it("GET delivery method", () => {
      return testDeliveryMethodById(0.5);
    });
  });

  describe("for deluxe customer", () => {
    beforeAll(async () => {
      const email = "ciso@" + config.get<string>("application.domain");
      const password = "mDLx?94T~1CfVfZMzw@sJ9f?s3L6lbMqE70FfI8^54jbNikY5fymx7c!YbJb";
      await loginAndSetAuthHeader(email, password);
    });

    it("GET delivery method", () => {
      return testDeliveryMethodById(0);
    });
  });
});
