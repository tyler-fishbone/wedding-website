"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { submitWeddingForm } from "./lib/submitWeddingForm";
import type { WeddingFormPayload } from "./lib/weddingFormTypes";

type WeddingConfig = {
  couple: string;
  heading: string;
  dateLabel: string;
  location: string;
  note: string;
  purposeText: string;
  privacyNote: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
};

type FormValues = {
  firstName1: string;
  lastName1: string;
  firstName2: string;
  lastName2: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  fortuneCookieHope: string;
};

const WEDDING_CONFIG: WeddingConfig = {
  couple: "Tyler + Katie",
  heading: "Save the Date",
  dateLabel: "April 4, 2027",
  location: "Austin, Texas",
  note: "Formal invitation and details to follow.",
  purposeText: "Share your mailing address for the formal invite.",
  privacyNote: "We’ll only use this for wedding communications and invitations.",
  startDateTime: "20270404T170000",
  endDateTime: "20270404T230000",
  timezone: "America/Chicago",
};

const initialValues: FormValues = {
  firstName1: "",
  lastName1: "",
  firstName2: "",
  lastName2: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  fortuneCookieHope: "",
};

const requiredFields: Array<keyof FormValues> = ["firstName1", "lastName1", "email", "phone", "address1", "city", "state", "zip"];

const buildGoogleCalendarUrl = (config: WeddingConfig): string => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${config.couple} Wedding`,
    dates: `${config.startDateTime}/${config.endDateTime}`,
    location: config.location,
    details: `${config.heading} - ${config.note}`,
    ctz: config.timezone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const validate = (values: FormValues): string | null => {
  for (const field of requiredFields) {
    if (!values[field].trim()) {
      return "Please fill out all required fields.";
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(values.email.trim())) {
    return "Please enter a valid email address.";
  }

  const digitsOnly = values.phone.replace(/\D/g, "");
  if (digitsOnly.length < 10) {
    return "Please enter a valid phone number with at least 10 digits.";
  }

  return null;
};

function HomeContent() {
  const searchParams = useSearchParams();
  const [values, setValues] = React.useState<FormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const isSingleGuest = searchParams.get("g") === "echad";
  const googleCalendarUrl = React.useMemo(() => buildGoogleCalendarUrl(WEDDING_CONFIG), []);

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
  };

  const fillWithTestData = () => {
    setSubmitted(false);
    setErrorMessage(null);
    setValues({
      firstName1: "Tyler",
      lastName1: "Fishbone",
      firstName2: isSingleGuest ? "" : "Katie",
      lastName2: isSingleGuest ? "" : "Berlin",
      email: "tyler.fishbone@gmail.com",
      phone: "3143244777",
      address1: "2207 Shoalmont Dr",
      address2: "",
      city: "Austin",
      state: "Texas",
      zip: "78756",
      fortuneCookieHope: "You will eat something excellent and slightly overpriced.",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitted(false);

    const validationError = validate(values);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: WeddingFormPayload = {
        firstName1: values.firstName1,
        lastName1: values.lastName1,
        firstName2: isSingleGuest ? "" : values.firstName2,
        lastName2: isSingleGuest ? "" : values.lastName2,
        email: values.email,
        phone: values.phone,
        address1: values.address1,
        address2: values.address2,
        city: values.city,
        state: values.state,
        zip: values.zip,
        fortuneCookieHope: values.fortuneCookieHope,
        submittedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      await submitWeddingForm(payload);

      setSubmitted(true);
      setValues(initialValues);
    } catch (error) {
      console.error("Failed to submit wedding form", error);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page">
      <section className="card heroCard">
        <div className="heroCardLayout">
          <div className="heroCardIntro">
            <div className="heroCardContent">
              <p className="eyebrow">{WEDDING_CONFIG.couple}</p>
              <h1>{WEDDING_CONFIG.heading}</h1>
              <p className="date">{WEDDING_CONFIG.dateLabel}</p>
              <p>{WEDDING_CONFIG.location}</p>
              <p>{WEDDING_CONFIG.note}</p>
            </div>

            <div className="heroCardArt" aria-hidden="true">
              <img src="/katie-tyler-drawing-bw.svg" alt="" className="heroCardArtImage" />
            </div>
          </div>

          <div className="calendarActions heroCardActions">
            <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="buttonLink">
              Add to Google Calendar
            </a>
            <a href="add-to-apple-calendar.ics" className="buttonLink secondary">
              Add to Apple Calendar
            </a>
          </div>
        </div>
      </section>

      <section className="card">
        {!submitted ? (
          <>
            <div className="sectionHeader">
              <h2>
                <button
                  type="button"
                  className="sectionHeadingButton"
                  onClick={fillWithTestData}
                  aria-label="Mailing Address. Hidden action: fill with test data."
                >
                  Mailing Address
                </button>
              </h2>
            </div>
            <p>{WEDDING_CONFIG.purposeText}</p>
            {isSingleGuest && <p className="guestModeNote">This invitation is currently set to collect details for one guest.</p>}

            {errorMessage && (
              <p className="errorMessage" role="alert" aria-live="polite">
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <label>
                {isSingleGuest ? "First Name *" : "First Name - Guest 1 *"}
                <input name="firstName1" value={values.firstName1} onChange={onInputChange} autoComplete="given-name" required />
              </label>

              <label>
                {isSingleGuest ? "Last Name *" : "Last Name - Guest 1 *"}
                <input name="lastName1" value={values.lastName1} onChange={onInputChange} autoComplete="family-name" required />
              </label>

              {!isSingleGuest && (
                <>
                  <label>
                    First Name - Guest 2
                    <input name="firstName2" value={values.firstName2} onChange={onInputChange} autoComplete="off" />
                  </label>

                  <label>
                    Last Name - Guest 2
                    <input name="lastName2" value={values.lastName2} onChange={onInputChange} autoComplete="off" />
                  </label>
                </>
              )}

              <label>
                Email * (one per household)
                <input type="email" name="email" value={values.email} onChange={onInputChange} autoComplete="email" required />
              </label>

              <label>
                Phone * (one per household)
                <input type="tel" name="phone" value={values.phone} onChange={onInputChange} autoComplete="tel" required />
              </label>

              <label>
                Address 1 *
                <input name="address1" value={values.address1} onChange={onInputChange} autoComplete="address-line1" required />
              </label>

              <label>
                Address 2
                <input name="address2" value={values.address2} onChange={onInputChange} autoComplete="address-line2" />
              </label>

              <label>
                City *
                <input name="city" value={values.city} onChange={onInputChange} autoComplete="address-level2" required />
              </label>

              <label>
                State *
                <input name="state" value={values.state} onChange={onInputChange} autoComplete="address-level1" required />
              </label>

              <label>
                ZIP *
                <input name="zip" value={values.zip} onChange={onInputChange} autoComplete="postal-code" required />
              </label>

              <label>
                What do you hope our next fortune cookie says?
                <textarea
                  name="fortuneCookieHope"
                  value={values.fortuneCookieHope}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      fortuneCookieHope: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </label>

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </form>

            <p className="privacyNote">{WEDDING_CONFIG.privacyNote}</p>
          </>
        ) : (
          <div className="successPanel" aria-live="polite">
            <h2>Address captured!</h2>
            <p className="successMessage">
              Thank you. We&apos;ve got your information and we will use it for wedding & pyramid scheme communication only.
            </p>
            <img src="/horse-high-five.png" alt="Katie and Tyler high-fiving on horseback" className="successPhoto" />
          </div>
        )}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={null}>
      <HomeContent />
    </React.Suspense>
  );
}
