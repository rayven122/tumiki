#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), "../../.env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to format dates for Google Calendar API
const getDateTimeString = (daysFromNow = 0, hour = 10, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
};

// Test helper
const runTest = async (testName, testFn) => {
  console.log(`\n🧪 Testing: ${testName}`);
  try {
    await testFn();
    console.log(`✅ PASSED: ${testName}`);
    testResults.passed.push(testName);
  } catch (error) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed.push({ name: testName, error: error.message });
  }
};

// Main test suite
async function runE2ETests() {
  console.log("=== Google Calendar MCP E2E Tests ===\n");

  // Start MCP server using StdioClientTransport
  const serverPath = path.join(__dirname, "dist", "index.js");

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: {
      ...process.env,
      GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    },
  });

  const client = new Client(
    {
      name: "google-calendar-e2e-test",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  try {
    await client.connect(transport);
    console.log("✅ MCP Server connected successfully\n");

    // Store created event ID for later tests
    let createdEventId = null;
    let calendarId = "primary";

    // Test 1: List calendars
    await runTest("List calendars (basic)", async () => {
      const result = await client.callTool({
        name: "list_calendars",
        arguments: {},
      });
      if (!result.content || result.content.length === 0) {
        throw new Error("No calendars returned");
      }
      const content = JSON.parse(result.content[0].text);
      if (!content.calendars || !Array.isArray(content.calendars)) {
        throw new Error("Invalid response format");
      }
      console.log(`   Found ${content.calendars.length} calendars`);
    });

    // Test 2: Get primary calendar
    await runTest("Get primary calendar", async () => {
      const result = await client.callTool({
        name: "get_calendar",
        arguments: { calendarId: "primary" },
      });
      if (!result.content || result.content.length === 0) {
        throw new Error("No calendar returned");
      }
      const content = JSON.parse(result.content[0].text);
      if (!content.id) {
        throw new Error("Invalid calendar data");
      }
      console.log(`   Calendar: ${content.summary || "Primary Calendar"}`);
    });

    // Test 3: List events (next 7 days)
    await runTest("List events (next 7 days)", async () => {
      const timeMin = getDateTimeString(0, 0, 0);
      const timeMax = getDateTimeString(7, 23, 59);

      const result = await client.callTool({
        name: "list_events",
        arguments: {
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
        },
      });
      if (!result.content || result.content.length === 0) {
        throw new Error("No response returned");
      }
      const content = JSON.parse(result.content[0].text);
      if (!content.events || !Array.isArray(content.events)) {
        throw new Error("Invalid response format");
      }
      console.log(`   Found ${content.events.length} events`);
    });

    // Test 4: Create event
    await runTest("Create test event", async () => {
      const startTime = getDateTimeString(1, 14, 0); // Tomorrow at 2 PM
      const endTime = getDateTimeString(1, 15, 0); // Tomorrow at 3 PM

      const result = await client.callTool({
        name: "create_event",
        arguments: {
          calendarId,
          summary: "E2E Test Event",
          description: "This is a test event created by E2E tests",
          start: {
            dateTime: startTime,
            timeZone: "Asia/Tokyo",
          },
          end: {
            dateTime: endTime,
            timeZone: "Asia/Tokyo",
          },
        },
      });

      if (!result.content || result.content.length === 0) {
        throw new Error("No event created");
      }
      const content = JSON.parse(result.content[0].text);
      if (!content.id) {
        throw new Error("Invalid event data");
      }
      createdEventId = content.id;
      console.log(`   Created event with ID: ${createdEventId}`);
    });

    // Test 5: Get created event
    await runTest("Get created event details", async () => {
      if (!createdEventId) {
        throw new Error("No event ID available");
      }

      const result = await client.callTool({
        name: "get_event",
        arguments: {
          calendarId,
          eventId: createdEventId,
        },
      });

      if (!result.content || result.content.length === 0) {
        throw new Error("Event not found");
      }
      const content = JSON.parse(result.content[0].text);
      if (content.id !== createdEventId) {
        throw new Error("Event ID mismatch");
      }
      console.log(`   Event: ${content.summary}`);
    });

    // Test 6: Update event
    await runTest("Update event title", async () => {
      if (!createdEventId) {
        throw new Error("No event ID available");
      }

      const startTime = getDateTimeString(1, 14, 0);
      const endTime = getDateTimeString(1, 16, 0); // Extended to 4 PM

      const result = await client.callTool({
        name: "update_event",
        arguments: {
          calendarId,
          eventId: createdEventId,
          summary: "E2E Test Event (Updated)",
          start: {
            dateTime: startTime,
            timeZone: "Asia/Tokyo",
          },
          end: {
            dateTime: endTime,
            timeZone: "Asia/Tokyo",
          },
        },
      });

      if (!result.content || result.content.length === 0) {
        throw new Error("Event not updated");
      }

      // Check if the result is an error
      if (result.isError) {
        throw new Error(result.content[0].text);
      }

      const content = JSON.parse(result.content[0].text);
      if (!content.summary.includes("Updated")) {
        throw new Error("Event title not updated");
      }
      console.log(`   Updated title: ${content.summary}`);
    });

    // Test 7: Search events
    await runTest("Search events by keyword", async () => {
      const result = await client.callTool({
        name: "search_events",
        arguments: {
          calendarId,
          q: "E2E Test",
        },
      });

      if (!result.content || result.content.length === 0) {
        throw new Error("No search results");
      }
      const content = JSON.parse(result.content[0].text);
      if (!content.events || !Array.isArray(content.events)) {
        throw new Error("Invalid response format");
      }
      console.log(`   Found ${content.events.length} matching events`);
    });

    // Test 8: Get free/busy info
    await runTest("Get free/busy information", async () => {
      const timeMin = getDateTimeString(0, 0, 0);
      const timeMax = getDateTimeString(1, 23, 59);

      const result = await client.callTool({
        name: "get_freebusy",
        arguments: {
          timeMin,
          timeMax,
          calendarIds: [calendarId],
          timeZone: "Asia/Tokyo",
        },
      });

      if (!result.content || result.content.length === 0) {
        throw new Error("No free/busy data returned");
      }
      const content = JSON.parse(result.content[0].text);
      if (!content.calendars) {
        throw new Error("Invalid response format");
      }
      console.log(`   Retrieved free/busy data`);
    });

    // Test 9: Get colors
    await runTest("Get available colors", async () => {
      const result = await client.callTool({
        name: "get_colors",
        arguments: {},
      });

      if (!result.content || result.content.length === 0) {
        throw new Error("No colors returned");
      }
      const content = JSON.parse(result.content[0].text);
      if (!content.calendar || !content.event) {
        throw new Error("Invalid response format");
      }
      console.log(
        `   Retrieved ${Object.keys(content.calendar).length} calendar colors and ${Object.keys(content.event).length} event colors`,
      );
    });

    // Test 10: Delete event
    await runTest("Delete test event", async () => {
      if (!createdEventId) {
        throw new Error("No event ID available");
      }

      const result = await client.callTool({
        name: "delete_event",
        arguments: {
          calendarId,
          eventId: createdEventId,
        },
      });

      if (!result.content || result.content.length === 0) {
        throw new Error("Delete operation failed");
      }
      console.log(`   Event deleted successfully`);
    });

    // Print summary
    console.log("\n=== Test Summary ===");
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);

    if (testResults.failed.length > 0) {
      console.log("\nFailed tests:");
      testResults.failed.forEach((test) => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }
  } catch (error) {
    console.error("Fatal error during tests:", error);
  } finally {
    await client.close();
    process.exit(testResults.failed.length > 0 ? 1 : 0);
  }
}

// Run tests
runE2ETests().catch(console.error);
