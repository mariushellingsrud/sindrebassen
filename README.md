# Sindrebassen Booking 💘

Bookingsystem for Sindre. Leah og bestekompisen deler ham, og appen holder styr på hvem som har hatt ham mest, i prosent. Etter bruk kan man melde skade, som på en leiebil.

**Åpne appen:** https://mariushellingsrud.github.io/sindrebassen/

## Legg den på telefonen

- **iPhone (Safari):** åpne lenken, trykk Del-knappen og velg «Legg til på Hjem-skjerm».
- **Android (Chrome):** åpne lenken, trykk ⋮ og velg «Installer app» eller «Legg til på startsiden».

## Slik virker den

- Første gang velger du om du er Leah eller bestekompisen. Telefonen husker det.
- For å booke, avbestille, melde skade eller endre navn trengs den hemmelige **Sindre-koden**. Alle kan se kalenderen, men bare dere to kan endre den.
- Dobbeltbooking stoppes i databasen, også hvis dere booker samtidig.
- Endringer dukker opp live på den andre telefonen.

## Teknisk

- Ren HTML/CSS/JS (`index.html`, `app.js`), ingen byggesteg. Ligger på GitHub Pages.
- Data i Supabase (`supabase/schema.sql`). Nøkkelen i `app.js` er den offentlige «anon»-nøkkelen. Den gir bare lesetilgang, og alle endringer går gjennom databasefunksjoner som sjekker Sindre-koden.
- Sindre-koden lagres bare som en bcrypt-hash i databasen, aldri i dette repoet.
