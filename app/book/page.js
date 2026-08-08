export default function BookingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 28px 80px",
        background:
          "radial-gradient(circle at 15% 15%, rgba(35,170,210,.12), transparent 32%), #06111d",
        color: "#f4f7fb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "28px",
            borderBottom: "1px solid rgba(255,255,255,.1)",
          }}
        >
          <a
            href="https://krovoro.com"
            style={{
              color: "#f4f7fb",
              textDecoration: "none",
              fontWeight: "800",
              letterSpacing: ".18em",
            }}
          >
            KROVORO
          </a>

          <a
            href="https://krovoro.com"
            style={{
              color: "#9eafc1",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            Back to Krovoro
          </a>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, .9fr) minmax(420px, 1.1fr)",
            gap: "70px",
            alignItems: "start",
            paddingTop: "80px",
          }}
        >
          <div>
            <div
              style={{
                color: "#68d9f7",
                fontSize: "13px",
                fontWeight: "800",
                letterSpacing: ".16em",
                marginBottom: "22px",
              }}
            >
              BOOK A LIVE DEMO
            </div>

            <h1
              style={{
                fontSize: "clamp(48px, 6vw, 78px)",
                lineHeight: ".98",
                margin: "0 0 28px",
                letterSpacing: "-.05em",
              }}
            >
              See Krovoro
              <br />
              work for your
              <br />
              business.
            </h1>

            <p
              style={{
                maxWidth: "560px",
                color: "#9eafc1",
                fontSize: "19px",
                lineHeight: "1.7",
                marginBottom: "42px",
              }}
            >
              Schedule a focused demonstration of the Krovoro AI Receptionist
              and see how it can answer calls, qualify leads, book appointments,
              and follow up automatically.
            </p>

            <div
              style={{
                display: "grid",
                gap: "18px",
                color: "#d7e0e9",
                fontSize: "15px",
              }}
            >
              <div>✓ See the AI Receptionist in action</div>
              <div>✓ Discuss your current call workflow</div>
              <div>✓ Explore integrations and automation</div>
              <div>✓ Get a deployment plan for your business</div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: "24px",
              background: "rgba(12,28,47,.88)",
              padding: "34px",
              boxShadow: "0 28px 80px rgba(0,0,0,.28)",
            }}
          >
            <div
              style={{
                color: "#68d9f7",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: ".15em",
                marginBottom: "14px",
              }}
            >
              30-MINUTE DEMO
            </div>

            <h2
              style={{
                margin: "0 0 12px",
                fontSize: "32px",
                letterSpacing: "-.03em",
              }}
            >
              Choose a time that works for you.
            </h2>

            <p
              style={{
                color: "#9eafc1",
                lineHeight: "1.65",
                margin: "0 0 30px",
              }}
            >
              The live calendar will appear here so visitors can select an
              available date and time instantly.
            </p>

            <div
              style={{
                minHeight: "420px",
                border: "1px dashed rgba(104,217,247,.32)",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "30px",
                background: "rgba(3,12,22,.35)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "38px",
                    marginBottom: "16px",
                  }}
                >
                  ◷
                </div>

                <iframe
  src="https://cal.com/krovoro/30min?embed=true"
  style={{
    width: "100%",
    height: "650px",
    border: "0",
    borderRadius: "16px",
  }}
  title="Book a Krovoro Demo"
/>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
