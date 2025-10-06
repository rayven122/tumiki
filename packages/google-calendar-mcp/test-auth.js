#!/usr/bin/env node
/**
 * Google Calendar Authentication Test
 *
 * Service Account認証をテストするスクリプト
 */
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const testServiceAccountAuth = async () => {
  console.log("=== Google Calendar Service Account Authentication Test ===\n");

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.error("❌ GOOGLE_SERVICE_ACCOUNT_KEY is not set");
    process.exit(1);
  }

  try {
    // Parse credentials
    const credentials = JSON.parse(serviceAccountKey);
    console.log("✅ Service Account credentials parsed successfully");
    console.log("   Project ID:", credentials.project_id);
    console.log("   Client Email:", credentials.client_email);

    // Create JWT client
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      subject: undefined, // Service Accountには domain-wide delegationが必要な場合がある
    });

    console.log("\n📡 Attempting to get access token...");

    // Try to get access token
    const tokenResponse = await auth.getAccessToken();

    if (tokenResponse.token) {
      console.log("✅ Access token obtained successfully");
      console.log(
        "   Token (first 20 chars):",
        tokenResponse.token.substring(0, 20) + "...",
      );
    } else {
      console.log("❌ Failed to get access token");
      process.exit(1);
    }

    // Test Calendar API
    console.log("\n📅 Testing Calendar API...");
    const calendar = google.calendar({ version: "v3", auth });

    try {
      const response = await calendar.calendarList.list({
        maxResults: 10,
      });

      console.log("✅ Calendar API call successful");
      console.log(
        "   Number of calendars found:",
        response.data.items?.length || 0,
      );

      if (response.data.items && response.data.items.length > 0) {
        console.log("\nCalendars:");
        response.data.items.forEach((cal, index) => {
          console.log(`   ${index + 1}. ${cal.summary} (${cal.id})`);
        });
      } else {
        console.log("\n⚠️  No calendars found. This might indicate:");
        console.log("   - The Service Account has no calendars shared with it");
        console.log("   - The Service Account needs domain-wide delegation");
        console.log(
          "   - Additional configuration is required in Google Workspace Admin",
        );
      }
    } catch (apiError) {
      console.error("❌ Calendar API call failed:", apiError.message);

      if (apiError.code === 403) {
        console.log("\n⚠️  Permission denied. Possible reasons:");
        console.log("   - The Service Account needs domain-wide delegation");
        console.log("   - Calendar API is not enabled in Google Cloud Console");
        console.log(
          "   - The Service Account does not have access to any calendars",
        );
      }

      throw apiError;
    }

    console.log("\n✅ All authentication tests passed!");
  } catch (error) {
    console.error("\n❌ Authentication test failed:", error.message);

    if (error.code) {
      console.error("   Error code:", error.code);
    }

    if (error.errors) {
      console.error(
        "   Detailed errors:",
        JSON.stringify(error.errors, null, 2),
      );
    }

    process.exit(1);
  }
};

testServiceAccountAuth();
