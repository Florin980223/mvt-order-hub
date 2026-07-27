  ---------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------
  ![Image: image1.jpg](brief_extract/media/image1.png){width="2.35in" height="0.5308377077865267in"}   ![Image: image2.jpg](brief_extract/media/image3.png){width="1.65in" height="0.7669510061242345in"}
  ---------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------

**PROJECT BRIEF TEHNIC**

**MVT ORDER HUB**

**Centralizator de comenzi --- MVP pentru implementare**

Specificație funcțională și tehnică pentru dezvoltarea frontendului,
backendului Supabase, conectării Microsoft Outlook și motorului de
extragere JavaScript / AI.

+----------------+----------------+----------------+----------------+
| **30 zile**    | **20.000/an**  | **1 inbox**    | **7 module**   |
|                |                |                |                |
| **Termen maxim | **Volum        | **Outlook      | **Interfață    |
| MVP**          | proiectat**    | conectat**     | MVP**          |
+----------------+----------------+----------------+----------------+

![Image: image3.jpg](brief_extract/media/image2.png){width="6.78in"
height="3.815777559055118in"}

*Mockup de referință pentru interfața principală MVT Order Hub.*

  **Versiune**   **Data**         **Destinație**
  -------------- ---------------- -----------------------
  **1.0**        **24.07.2026**   **Echipă dezvoltare**

+-------+-------------------------------------------------------------+
| **1** | **Scopul documentului**                                     |
|       |                                                             |
|       | Document executabil pentru construirea MVP-ului, nu         |
|       | prezentare comercială.                                      |
+-------+-------------------------------------------------------------+

Acest brief definește funcționalitățile obligatorii, arhitectura,
fluxurile, modelul de date, funcțiile backend, criteriile de acceptare
și ordinea recomandată de implementare pentru MVT Order Hub.

+----------------------------------------------------------------------+
| **✓ Rezultatul așteptat**                                            |
|                                                                      |
| La finalul MVP-ului, un operator MVT se autentifică, conectează un   |
| inbox Outlook, vede automat emailurile de comandă, rulează           |
| extragerea datelor prin JavaScript, AI sau modul hibrid, validează   |
| informațiile și importă ori exportă comanda către AscendTMS.         |
+----------------------------------------------------------------------+

1.1 Obiective MVP
-----------------

> **•** Centralizarea într-o singură interfață a emailurilor care pot
> conține comenzi de transport.
>
> **•** Preluarea automată a mesajelor și atașamentelor dintr-un cont
> Microsoft Outlook conectat din pagina Setări.
>
> **•** Extragerea datelor din corpul emailului, PDF, Excel și CSV
> folosind reguli JavaScript/TypeScript și, când este necesar, un agent
> AI.
>
> **•** Validarea umană a câmpurilor înainte de import, cu evidențierea
> datelor incerte sau lipsă.
>
> **•** Păstrarea istoricului complet: email sursă, fișiere, date
> extrase, corecții, import și confirmare client.
>
> **•** Funcționare asincronă și sigură pentru un volum de aproximativ
> 20.000 de comenzi anual.

1.2 Principii de implementare
-----------------------------

  **Principiu**                 **Regulă pentru MVP**
  ----------------------------- --------------------------------------------------------------------------------------------------------
  Deterministic înainte de AI   Excel, CSV și formatele cunoscute se procesează cu JavaScript/TypeScript și reguli configurabile.
  AI ca fallback                Agentul AI se apelează pentru texte libere, documente necunoscute sau câmpuri cu încredere redusă.
  Human-in-the-loop             Importul nu se execută automat dacă lipsesc câmpuri obligatorii sau pragul de încredere nu este atins.
  Idempotent                    Același email sau webhook nu trebuie să creeze de două ori aceeași comandă.
  Auditabil                     Orice schimbare importantă trebuie înregistrată cu utilizator, timp și valori înainte/după.

1.3 Indicatori de succes
------------------------

+----------------+----------------+----------------+----------------+
| **\< 60 sec**  | **100%**       | **0**          | **≤ 3 min**    |
|                |                |                |                |
| **Email        | **Atașamente   | **Importuri    | **Procesare    |
| vizibil după   | păstrate**     | duplicate**    | oper           |
| primire**      |                |                | ator/comandă** |
+----------------+----------------+----------------+----------------+

+-------+-------------------------------------------------------------+
| **2** | **Domeniul MVP**                                            |
|       |                                                             |
|       | Ce se construiește în prima versiune și ce rămâne în afara  |
|       | acesteia.                                                   |
+-------+-------------------------------------------------------------+

2.1 Module incluse
------------------

  **Modul**              **Funcții obligatorii**
  ---------------------- -----------------------------------------------------------------------------------------
  Autentificare          Login, logout, resetare parolă, rol Admin și rol Operator.
  Dashboard              Inbox recent și detaliu comandă în split view; acțiuni rapide.
  Emailuri noi           Listă inbox, căutare, filtre, citire corp email, atașamente, declanșare extragere.
  Comenzi în așteptare   Comenzi extrase care necesită validare, carrier sau pregătire de import.
  Comenzi importate      Istoric, ID AscendTMS, status import, confirmare client, export document.
  Rapoarte               KPI de bază, volume, statusuri, timp mediu, export CSV.
  Setări                 Conectare Outlook, mod extragere, prag încredere, AscendTMS, utilizatori și notificări.

2.2 Roluri și permisiuni
------------------------

  **Acțiune**                        **Operator**   **Administrator**
  ---------------------------------- -------------- -------------------
  Vizualizează emailuri și comenzi   Da             Da
  Rulează extragerea                 Da             Da
  Corectează date                    Da             Da
  Importă în AscendTMS               Da             Da
  Respinge / arhivează               Da             Da
  Conectează Outlook                 Nu             Da
  Configurează AI și praguri         Nu             Da
  Gestionează utilizatori            Nu             Da
  Vede loguri tehnice                Limitat        Da

2.3 În afara MVP-ului
---------------------

> **•** Portal B2B pentru clienți, tracking GPS, marketplace de
> transportatori și aplicație mobilă nativă.
>
> **•** Antrenarea unui model AI propriu sau fine-tuning dedicat.
>
> **•** RPA complex pentru controlarea interfeței desktop AscendTMS,
> dacă nu există API/import stabil.
>
> **•** Facturare, plăți, contabilitate, gestionarea CMR/POD după
> livrare și integrarea cu alte ERP-uri.
>
> **•** Multi-tenancy comercial pentru alte companii; MVP-ul este
> dedicat MVT.

+----------------------------------------------------------------------+
| **! Limită importantă AscendTMS**                                    |
|                                                                      |
| MVP-ul trebuie să implementeze o singură metodă stabilă de           |
| integrare: API, import CSV/Excel sau export pregătit pentru import.  |
| Automatizarea desktop/RPA se estimează separat dacă devine necesară. |
+----------------------------------------------------------------------+

+-------+-------------------------------------------------------------+
| **3** | **Arhitectura tehnică**                                     |
|       |                                                             |
|       | Frontend web + backend Supabase + Microsoft Graph + motor   |
|       | de extracție.                                               |
+-------+-------------------------------------------------------------+

3.1 Stack recomandat
--------------------

  **Strat**      **Tehnologie / responsabilitate**
  -------------- -----------------------------------------------------------------------------------------------------------
  Frontend       React + TypeScript. Routing, formulare, tabel inbox, vizualizare documente, validare și rapoarte.
  Backend        Supabase: PostgreSQL, Auth, Storage, Edge Functions, Queues, Cron și Realtime unde este util.
  Email          Microsoft Entra ID + OAuth 2.0 + Microsoft Graph pentru citirea mesajelor și change notifications.
  Extragere JS   TypeScript/JavaScript pentru parsare email, regex, mapări, Excel/CSV și PDF digital.
  Extragere AI   Edge Function care trimite textul/documentul către furnizorul AI și solicită răspuns JSON strict.
  AscendTMS      Adapter backend pentru API/import CSV/Excel. Implementarea concretă se stabilește după validarea tehnică.

3.2 Diagramă logică
-------------------

  ------------- ------------- ----------- --------------- -------------- -------------- ---------------
  **Outlook**   **Webhook**   **Queue**   **Extracție**   **Postgres**   **Frontend**   **AscendTMS**
  ------------- ------------- ----------- --------------- -------------- -------------- ---------------

**Email nou → notificare Microsoft Graph → job persistent → extragere
JS/AI → validare → import**

3.3 Reguli de separare frontend / backend
-----------------------------------------

  **Frontend**                                                    **Backend Supabase**
  --------------------------------------------------------------- --------------------------------------------------------------------------------------
  Afișează datele și gestionează interacțiunile utilizatorului.   Deține logica sensibilă, tokenurile, integrarea Microsoft și integrarea AscendTMS.
  Folosește Supabase JS cu cheia anon și politici RLS.            Folosește service role doar în Edge Functions; cheia nu ajunge niciodată în browser.
  Nu parsează fișiere sensibile în mod obligatoriu în browser.    Procesează fișierele, păstrează loguri, retry-uri și statusuri de job.
  Nu stochează tokenuri Microsoft Graph.                          Păstrează tokenurile criptat și reînnoiește subscripțiile.

+----------------------------------------------------------------------+
| **✓ Decizie arhitecturală**                                          |
|                                                                      |
| Pentru MVP nu este necesar un VPS separat. Edge Functions primesc    |
| webhook-uri și orchestrează integrările, iar joburile persistente    |
| sunt păstrate în Supabase Queues/Postgres. Procesele foarte grele    |
| pot fi mutate ulterior într-un worker separat fără schimbarea        |
| frontendului.                                                        |
+----------------------------------------------------------------------+

+-------+-----------------------------------------------------------+
| **4** | **Conectarea Microsoft Outlook**                          |
|       |                                                           |
|       | Flux OAuth, webhook și sincronizare automată a inboxului. |
+-------+-----------------------------------------------------------+

4.1 Experiența din pagina Setări
--------------------------------

> **•** Administratorul apasă „Conectează Outlook".
>
> **•** Aplicația redirecționează către Microsoft pentru autentificare
> și consimțământ OAuth; parola Microsoft nu este introdusă în MVT Order
> Hub.
>
> **•** După callback, backendul salvează conexiunea, identificatorul
> mailboxului și tokenurile în mod securizat.
>
> **•** Se creează o subscripție Microsoft Graph pentru mesajele noi din
> Inbox.
>
> **•** Interfața afișează starea: Conectat, Eroare, Expiră curând,
> Ultima sincronizare și buton Reconectează.

4.2 Moduri de autorizare
------------------------

  **Mod**                  **Utilizare**                                                            **Observație**
  ------------------------ ------------------------------------------------------------------------ ---------------------------------------------------------------------------
  Delegated OAuth          Un utilizator conectează propriul mailbox din interfață.                 Simplu pentru MVP; subscrierea vizează mailboxul utilizatorului conectat.
  Application permission   Inbox comun sau procesare fără dependență de un utilizator individual.   Necesită configurare și admin consent în tenantul Microsoft 365.

4.3 Edge Functions necesare
---------------------------

  **Funcție**                **Responsabilitate**
  -------------------------- -----------------------------------------------------------------------------------------
  outlook-oauth-callback     Schimbă authorization code în tokenuri, salvează conexiunea și creează subscripția.
  graph-webhook              Validează endpointul Microsoft, verifică clientState și adaugă rapid mesajul în coadă.
  fetch-outlook-message      Citește mesajul complet, body, headers și lista de atașamente.
  download-attachments       Descarcă fișierele, calculează checksum și le salvează în Storage.
  renew-graph-subscription   Rulează periodic prin Cron și reînnoiește subscripția înainte de expirare.
  outlook-resync             Sincronizare manuală pentru recuperarea mesajelor ratate într-un interval configurabil.

4.4 Algoritmul webhook
----------------------

  ---------------------------------------------------------------------
  POST /functions/v1/graph-webhook\
  1. Dacă există validationToken → returnează tokenul ca text/plain.\
  2. Pentru fiecare notificare:\
  - verifică subscriptionId și clientState;\
  - generează idempotency\_key;\
  - inserează jobul în queue;\
  - răspunde HTTP 202 fără procesare grea.\
  3. Workerul citește emailul prin Microsoft Graph.\
  4. Salvează emailul și atașamentele.\
  5. Lansează jobul de extracție.

  ---------------------------------------------------------------------

+----------------------------------------------------------------------+
| **! Cerință de fiabilitate**                                         |
|                                                                      |
| Webhook-ul trebuie să răspundă rapid și să nu proceseze PDF/Excel/AI |
| în request-ul primit de la Microsoft. Orice procesare grea se        |
| execută din coadă, cu retry și log de eroare.                        |
+----------------------------------------------------------------------+

+-------+---------------------------------------------------------------+
| **5** | **Motorul de extragere**                                      |
|       |                                                               |
|       | JavaScript/TypeScript, agent AI și modul hibrid configurabil. |
+-------+---------------------------------------------------------------+

5.1 Moduri disponibile în Setări
--------------------------------

  **Mod**                 **Comportament**
  ----------------------- ------------------------------------------------------------------------------------------------------
  JavaScript              Folosește exclusiv parsere, regex, mapări de coloane și template-uri pe expeditor.
  AI                      Trimite conținutul eligibil către agentul AI și primește obiect JSON structurat.
  Hibrid --- recomandat   Rulează mai întâi JavaScript; AI completează numai câmpurile lipsă sau cele sub pragul de încredere.

5.2 Tipuri de surse
-------------------

  **Sursă**              **Procesare MVP**
  ---------------------- ---------------------------------------------------------------------------------------------
  Corp email HTML/Text   Sanitizare HTML, conversie în text, regex, detectare etichete și expresii frecvente.
  CSV                    Detectare separator/encoding, normalizare anteturi, mapare coloane și validare tipuri.
  Excel XLS/XLSX         Citirea foilor relevante, detectarea tabelului principal și maparea pe câmpurile comenzii.
  PDF digital            Extracție text; căutare după etichete și, dacă este necesar, trimitere către AI.
  PDF scanat / imagine   În MVP: marcat „Necesită OCR/validare" sau procesat prin serviciu OCR dacă este configurat.

5.3 Schema de ieșire a extragerii
---------------------------------

  -------------------------------------------------------------------------------------------
  {\
  \"client\_order\_number\": \"PO-450089\",\
  \"client\_name\": \"TechParts Solutions SRL\",\
  \"sender\_email\": \"office\@techparts.ro\",\
  \"pickup\": {\"address\": \"\...\", \"datetime\": \"2026-07-24T09:00:00+03:00\"},\
  \"delivery\": {\"address\": \"\...\", \"datetime\": \"2026-07-27T17:00:00+02:00\"},\
  \"cargo\": {\"type\": \"Piese auto\", \"quantity\": 15, \"unit\": \"paleti\",\
  \"weight\_kg\": 4250, \"volume\_m3\": 18.75},\
  \"transport\_value\": {\"amount\": 3450, \"currency\": \"EUR\"},\
  \"carrier\_proposed\": \"DB Schenker Road\",\
  \"notes\": \"Poarta 3\...\",\
  \"confidence\": {\"overall\": 0.92, \"fields\": {\"pickup.address\": 0.97}},\
  \"warnings\": \[\"carrier\_proposed\_needs\_validation\"\],\
  \"source\_refs\": \[{\"field\": \"weight\_kg\", \"source\": \"attachment:Anexa.xlsx\"}\]\
  }

  -------------------------------------------------------------------------------------------

5.4 Calcularea încrederii
-------------------------

> **•** Fiecare câmp are confidence între 0 și 1 și sursa din care a
> fost extras.
>
> **•** Câmpurile rezultate direct din coloane cunoscute primesc scor
> ridicat; valorile deduse sau completate de AI au scor
> furnizat/normalizat.
>
> **•** Pragul implicit recomandat este 0,85 și poate fi schimbat de
> administrator.
>
> **•** Comanda devine „Gata de import" numai dacă toate câmpurile
> obligatorii sunt prezente și nu există avertismente blocante.

5.5 Câmpuri obligatorii pentru import
-------------------------------------

  **Grup**       **Câmpuri**
  -------------- -----------------------------------------------------------------------------------------
  Identificare   Număr comandă client, client/expeditor.
  Rută           Adresă pickup, adresă delivery.
  Programare     Dată și oră pickup; dată și oră delivery dacă este obligatorie în AscendTMS.
  Marfă          Tip marfă și minimum o valoare de cantitate/greutate/volum conform mapării Ascend.
  Transport      Valoare/monedă dacă sunt cerute; carrier dacă fluxul MVT îl solicită înainte de import.

+-------+-------------------------------------------------------------------+
| **6** | **Flux operațional și statusuri**                                 |
|       |                                                                   |
|       | Stări clare, acțiuni permise și protecție împotriva duplicatelor. |
+-------+-------------------------------------------------------------------+

6.1 Flux end-to-end
-------------------

  **Pas**   **Stare**        **Descriere**
  --------- ---------------- ---------------------------------------------------------
  1         Email primit     Webhook / sincronizare detectează mesajul.
  2         În coadă         Job persistent creat cu idempotency key.
  3         Procesare        Email și atașamente salvate; parserele rulează.
  4         Extras           Datele sunt disponibile cu scor de încredere.
  5         Validare         Operatorul verifică și corectează câmpurile.
  6         Gata de import   Toate regulile obligatorii sunt îndeplinite.
  7         Import           Adapterul transmite sau exportă datele către AscendTMS.
  8         Confirmare       Status salvat; opțional se trimite email clientului.

6.2 Statusuri email
-------------------

  **Status**          **Semnificație**
  ------------------- ---------------------------------------------
  new                 Mesaj preluat, încă neprocesat.
  queued              Jobul a fost adăugat în coadă.
  processing          Se descarcă și se parsează.
  extracted           Extragere terminată.
  needs\_validation   Există date neclare sau lipsă.
  rejected            Mesajul nu este comandă sau a fost respins.
  archived            Proces închis.

6.3 Statusuri comandă
---------------------

  **Status**          **Acțiuni permise**
  ------------------- -----------------------------------------------
  draft               Editare și rerulare extracție.
  needs\_validation   Corectare, atribuire carrier, respingere.
  ready\_to\_import   Import / export AscendTMS.
  importing           Doar vizualizare; prevenire click duplicat.
  imported            Vizualizare, istoric, confirmare, export PDF.
  import\_failed      Retry după corectarea erorii.
  rejected            Vizualizare și restaurare de administrator.

6.4 Detectarea duplicatelor
---------------------------

> **•** Cheie primară externă: Microsoft Graph message\_id +
> mailbox\_id.
>
> **•** Checksum SHA-256 pentru fiecare atașament și pentru combinația
> expeditor + număr comandă client.
>
> **•** Înainte de import se caută o comandă existentă cu același
> număr/client și stare imported/importing.
>
> **•** Butonul de import devine disabled imediat după declanșarea
> jobului; backendul aplică un lock/idempotency key.

+-------+---------------------------------------------------+
| **7** | **Model de date Supabase**                        |
|       |                                                   |
|       | Entitățile minime și relațiile necesare MVP-ului. |
+-------+---------------------------------------------------+

7.1 Tabele principale
---------------------

  **Tabel**               **Scop**                     **Câmpuri esențiale**
  ----------------------- ---------------------------- -------------------------------------------------------------------------------------------------
  profiles                Utilizatori aplicație        id, full\_name, role, active, created\_at
  mail\_connections       Conexiuni Outlook            id, mailbox\_address, tenant\_id, token\_ref, status, last\_sync\_at
  graph\_subscriptions    Subscripții webhook          connection\_id, subscription\_id, resource, expires\_at, client\_state\_hash
  emails                  Mesajele preluate            id, graph\_message\_id, sender, subject, body\_html, body\_text, received\_at, status
  email\_attachments      Fișiere                      email\_id, filename, mime\_type, size, storage\_path, sha256
  extraction\_jobs        Joburi procesare             email\_id, mode, status, attempts, error, started\_at, finished\_at
  orders                  Comanda normalizată          email\_id, client\_order\_no, client, pickup, delivery, cargo, value, currency, carrier, status
  order\_field\_sources   Trasabilitate câmp           order\_id, field\_name, source\_type, source\_ref, confidence
  order\_events           Timeline / audit business    order\_id, event\_type, payload, user\_id, created\_at
  import\_jobs            Import AscendTMS             order\_id, mode, status, external\_id, request, response, error
  notifications           Notificări UI                user\_id, type, title, read\_at, entity\_id
  app\_settings           Configurații                 key, value\_json, encrypted, updated\_by
  audit\_logs             Audit tehnic și securitate   actor\_id, action, entity, entity\_id, old\_data, new\_data, ip, created\_at

7.2 Structură recomandată pentru comenzi
----------------------------------------

  **Câmp**                  **Tip orientativ**   **Observație**
  ------------------------- -------------------- -----------------------------------------------
  id                        uuid                 Primary key.
  email\_id                 uuid                 Legătură la emailul sursă.
  client\_order\_number     text                 Index compus cu client\_id.
  client\_name              text                 În MVP poate fi text; ulterior tabel clients.
  pickup\_address           text                 Adresă normalizată.
  pickup\_at                timestamptz          Păstrat cu timezone.
  delivery\_address         text                 Adresă normalizată.
  delivery\_at              timestamptz          Poate fi null dacă nu există.
  cargo\_type               text                 Tip marfă.
  quantity                  numeric              Valoare cantitate.
  quantity\_unit            text                 paleți, colete etc.
  weight\_kg                numeric              Unitate standardizată.
  volume\_m3                numeric              Unitate standardizată.
  transport\_amount         numeric              Suma.
  currency                  char(3)              EUR/RON etc.
  carrier\_proposed         text                 Poate necesita validare.
  notes                     text                 Instrucțiuni.
  confidence\_overall       numeric              0--1.
  status                    text/enum            Conform state machine.
  ascend\_external\_id      text                 Setat după import.
  created\_by/updated\_by   uuid                 Audit utilizator.

7.3 RLS minim obligatoriu
-------------------------

> **•** Utilizatorii autentificați văd datele operaționale; acțiunile
> administrative sunt limitate rolului Admin.
>
> **•** Storage folosește bucket privat; fișierele se deschid prin
> signed URL cu durată scurtă.
>
> **•** Tabelele cu tokenuri și configurații criptate nu sunt accesibile
> direct frontendului.
>
> **•** service\_role este folosit exclusiv în funcțiile backend și nu
> este inclus în bundle-ul frontend.

+-------+-------------------------------------------------------+
| **8** | **Backend Supabase**                                  |
|       |                                                       |
|       | Funcții, cozi, cron, validări și adapterul AscendTMS. |
+-------+-------------------------------------------------------+

8.1 Inventar Edge Functions
---------------------------

  **Funcție**                **Trigger**                **Rezultat**
  -------------------------- -------------------------- --------------------------------------------------------------
  graph-webhook              Microsoft Graph            Adaugă job email în coadă.
  outlook-connect-callback   OAuth redirect             Salvează conexiune și creează subscripție.
  process-email-job          Queue/Cron                 Citește mesaj, descarcă atașamente, creează extraction\_job.
  extract-order              Queue / acțiune UI         Rulează JavaScript, AI sau hibrid și salvează comanda.
  retry-extraction           Acțiune UI/Admin           Repornește un job eșuat păstrând istoricul.
  import-ascend              Acțiune UI                 Validează, blochează duplicatul și apelează adapterul.
  send-client-confirmation   Acțiune UI / după import   Trimite email de confirmare și salvează evenimentul.
  generate-report            Acțiune UI                 Generează CSV/JSON pentru interval și filtre.
  subscription-renewal       Cron zilnic                Reînnoiește subscripțiile Microsoft Graph.
  reconcile-stuck-jobs       Cron periodic              Marchează/repornește joburile blocate.

8.2 Interfață adapter AscendTMS
-------------------------------

  --------------------------------------------------------------------------
  interface AscendAdapter {\
  validate(order: NormalizedOrder): Promise\<ValidationResult\>;\
  createOrder(order: NormalizedOrder, idempotencyKey: string): Promise\<{\
  externalId: string;\
  rawResponse?: unknown;\
  }\>;\
  getOrderStatus?(externalId: string): Promise\<string\>;\
  }\
  \
  // Implementări posibile pentru MVP:\
  // AscendApiAdapter \| AscendCsvAdapter \| AscendExcelAdapter

  --------------------------------------------------------------------------

8.3 Retry și tratarea erorilor
------------------------------

  **Categorie**             **Comportament**
  ------------------------- ----------------------------------------------------------------------------------------------
  Microsoft 429/5xx         Retry exponențial; respectă Retry-After când este disponibil.
  Fișier corupt             Marchează attachment\_error și solicită validare manuală.
  AI timeout/invalid JSON   O singură reîncercare automată; apoi needs\_validation.
  Ascend timeout            Nu creează al doilea import; verifică idempotency key înainte de retry.
  Job blocat                Cron identifică status processing peste limita configurată și îl marchează failed/retryable.

8.4 Secrete backend
-------------------

  ---------------------------------------------------------
  SUPABASE\_URL\
  SUPABASE\_SERVICE\_ROLE\_KEY\
  MICROSOFT\_TENANT\_ID\
  MICROSOFT\_CLIENT\_ID\
  MICROSOFT\_CLIENT\_SECRET\
  GRAPH\_CLIENT\_STATE\_SECRET\
  AI\_PROVIDER\_API\_KEY \# dacă modul AI este activ\
  ASCEND\_API\_URL / ASCEND\_API\_KEY \# dacă există API\
  ENCRYPTION\_KEY \# pentru datele sensibile

  ---------------------------------------------------------

+-------+------------------------------------------------------------------+
| **9** | **Frontend --- cerințe generale**                                |
|       |                                                                  |
|       | Interfață desktop-first, rapidă și ușor de folosit de operatori. |
+-------+------------------------------------------------------------------+

9.1 Cerințe tehnice
-------------------

> **•** React + TypeScript, componente reutilizabile și validare strictă
> a formularelor.
>
> **•** Layout desktop optimizat pentru 1440--1920 px; suport rezonabil
> pentru tabletă.
>
> **•** Stare server gestionată predictibil; refresh sau reconectare
> fără pierderea editărilor salvate.
>
> **•** Tabele cu căutare, filtrare, sortare, paginare și păstrarea
> filtrelor în URL sau store.
>
> **•** Accesibilitate de bază: focus vizibil, label-uri, navigare
> tastatură și contrast suficient.
>
> **•** Toate textele în limba română; date DD.MM.YYYY, oră 24h,
> greutate kg, volum m³.

9.2 Componente reutilizabile
----------------------------

  **Componentă**               **Utilizare**
  ---------------------------- -------------------------------------------------
  OrderStatusBadge             Status email/comandă, culori consistente.
  ConfidenceBadge              Procent și nivel: verde/galben/roșu.
  AttachmentCard               Nume, tip, dimensiune, preview și descărcare.
  OrderField                   Câmp cu source, confidence, warning și editare.
  SplitViewLayout              Listă stânga + detaliu dreapta.
  ActionBar                    Import, corectare, respingere și confirmare.
  Timeline                     Evenimente comandă și import.
  Empty/Error/Loading states   Toate paginile trebuie să aibă stări explicite.

9.3 Reguli UX obligatorii
-------------------------

> **•** Selectarea unui email actualizează panoul de detaliu fără
> navigare completă.
>
> **•** Câmpurile sub pragul de încredere sunt marcate galben; lipsurile
> blocante sunt roșii.
>
> **•** Butonul principal este „Salvează & Importă în AscendTMS" și este
> activ numai când datele sunt valide.
>
> **•** Modificările manuale trebuie salvate înainte de import și
> marcate în audit.
>
> **•** Acțiunile destructive solicită confirmare și motiv
> opțional/obligatoriu.
>
> **•** Fișierele HTML/email se afișează sanitizat pentru evitarea
> scripturilor și tracking-ului extern.

+--------+------------------------------------------------------------+
| **10** | **Specificații UI pe pagini**                              |
|        |                                                            |
|        | Mockup-urile sunt reper vizual; comportamentul și stările  |
|        | descrise sunt obligatorii.                                 |
+--------+------------------------------------------------------------+

10.1 Dashboard / Centralizator
------------------------------

> **•** Sidebar: Dashboard, Emailuri noi, Comenzi în așteptare, Comenzi
> importate, Rapoarte, Setări.
>
> **•** Header: conexiune Outlook, notificări și profil utilizator.
>
> **•** Split view: lista emailurilor în stânga și formularul comenzii
> în dreapta.
>
> **•** Preview atașamente, scor de încredere, avertismente și bara de
> acțiuni fixă în partea de jos.

![Image: image3.jpg](brief_extract/media/image2.png){width="6.78in"
height="3.815777559055118in"}

*Figura 1 --- Dashboard centralizator și formularul comenzii selectate.*

10.2 Emailuri noi
=================

> **•** Inbox cu filtre: Toate, Necesită validare, Cu atașamente și
> Prioritare.
>
> **•** Panou de citire cu From/To/CC, corpul emailului și lista
> atașamentelor.
>
> **•** Buton de extragere și preview rapid al datelor obținute înainte
> de crearea comenzii.

![Image: image4.jpg](brief_extract/media/image4.png){width="6.78in"
height="3.815777559055118in"}

*Figura 2 --- Pagina Emailuri noi, cu email selectat și extracție
disponibilă.*

10.3 Procesare și comenzi în așteptare
======================================

> **•** Workflow vizual: primire email, citire atașament, extragere și
> pregătire import.
>
> **•** Formular grupat pe Date comandă, Rute, Programare, Marfă și
> Transport.
>
> **•** Confidence per câmp și avertisment agregat pentru câmpurile care
> necesită validare.

![Image: image5.jpg](brief_extract/media/image6.png){width="6.78in"
height="3.815777559055118in"}

*Figura 3 --- Ecranul de procesare/validare a unei comenzi.*

10.4 Comenzi importate
======================

> **•** Listă cu status de import și follow-up.
>
> **•** Detaliu read-only cu ID AscendTMS, dată import, operator și
> atașamente.
>
> **•** Acțiuni: deschide în AscendTMS, istoric import, retrimite
> confirmare și exportă PDF.

![Image: image6.jpg](brief_extract/media/image5.png){width="6.78in"
height="3.815777559055118in"}

*Figura 4 --- Istoricul comenzilor importate și rezultatul importului.*

10.5 Rapoarte
=============

> **•** Filtru interval și rută/client unde este disponibil.
>
> **•** KPI: emailuri procesate, comenzi extrase, în validare, importate
> și rată de succes.
>
> **•** Grafice de bază și tabel de istoric; export CSV obligatoriu, PDF
> opțional în MVP.

![Image: image7.jpg](brief_extract/media/image8.png){width="6.78in"
height="3.815777559055118in"}

*Figura 5 --- Pagina Rapoarte, folosită ca reper vizual pentru KPI și
grafice.*

10.6 Setări
===========

> **•** Card Outlook cu Connect/Reconnect, status și ultima
> sincronizare.
>
> **•** Mod de extracție: JavaScript, AI sau Hibrid; prag minim de
> încredere.
>
> **•** Configurare AscendTMS, notificări, utilizatori, securitate și
> retenție.
>
> **•** Secretele nu se afișează integral și nu sunt citite din
> frontend.

![Image: image8.jpg](brief_extract/media/image7.png){width="6.78in"
height="3.815777559055118in"}

*Figura 6 --- Pagina Setări și integrarea Outlook/AscendTMS.*

+--------+--------------------------------------------------+
| **11** | **Securitate, performanță și observabilitate**   |
|        |                                                  |
|        | Cerințe minime înainte de lansarea în producție. |
+--------+--------------------------------------------------+

11.1 Securitate
---------------

  **Cerință**          **Implementare minimă**
  -------------------- -----------------------------------------------------------------------------------------
  Autentificare        Supabase Auth; parole gestionate de platformă; resetare securizată.
  Autorizare           RLS pe tabele operaționale; rol verificat și server-side pentru acțiuni administrative.
  Tokenuri Microsoft   Criptate/secret store; niciodată returnate frontendului.
  Fișiere              Bucket privat, signed URLs, validare MIME/size și denumiri randomizate.
  Email HTML           Sanitizare; fără executare scripturi și fără încărcare automată resurse externe.
  Audit                Login, conectare Outlook, corecții, import, respingere și setări în audit\_logs.
  Date sensibile       Minimizare, retenție configurabilă și posibilitate de ștergere conform politicii MVT.

11.2 Performanță și limite MVP
------------------------------

  **Element**       **Țintă / regulă**
  ----------------- ---------------------------------------------------------------------------------
  Volum             20.000 comenzi/an; sistemul nu presupune procesare exclusiv serială.
  Peak orientativ   Minimum 300 emailuri/zi fără pierderea joburilor.
  Atașament         Limită recomandată 25 MB/fișier, configurabilă.
  Webhook           Răspuns rapid; procesarea se face din coadă.
  Listare           Paginare server-side și indecși pe status, received\_at, client\_order\_number.
  Timeout AI        Configurabil; fallback la validare manuală.
  Realtime          Folosit pentru status job/import; polling fallback permis.

11.3 Observabilitate
--------------------

> **•** Log structurat per job: correlation\_id, email\_id, order\_id,
> function, duration, status și error\_code.
>
> **•** Ecran administrativ minim pentru joburi eșuate și retry manual.
>
> **•** Alerte pentru expirarea conexiunii Outlook, subscripție
> nereînnoită și importuri eșuate.
>
> **•** Metrici: joburi procesate, rată eșec, durată medie și număr
> retry-uri.

+--------+----------------------------------------------------------+
| **12** | **Criterii de acceptare și testare**                     |
|        |                                                          |
|        | Condițiile concrete pentru considerarea MVP-ului livrat. |
+--------+----------------------------------------------------------+

12.1 Acceptare funcțională
--------------------------

  **Zonă**       **Criteriu**
  -------------- ---------------------------------------------------------------------------------------
  Outlook        Adminul conectează inboxul din UI și starea Conectat persistă după relogare.
  Sincronizare   Un email nou apare în aplicație fără introducere manuală și fără duplicare.
  Atașamente     PDF/Excel/CSV sunt salvate, pot fi previzualizate/descărcate și au checksum.
  Extragere JS   Un set de documente cunoscute este extras corect prin reguli JavaScript/TypeScript.
  Extragere AI   Un email liber poate fi transformat în schema JSON și câmpurile incerte sunt marcate.
  Validare       Operatorul editează câmpurile și modificările sunt păstrate în audit.
  Import         O comandă validă este transmisă/exportată către AscendTMS o singură dată.
  Erori          Un job eșuat afișează mesaj clar și poate fi reîncercat fără pierderea datelor.
  Rapoarte       KPI de bază corespund datelor din DB și exportul CSV funcționează.
  Securitate     Un operator nu poate modifica integrarea Outlook sau utilizatorii.

12.2 Teste obligatorii
----------------------

  **Tip**             **Acoperire minimă**
  ------------------- ----------------------------------------------------------------------------------------
  Unit                Parser email, normalizare date/numere, mapare CSV/XLSX, validări și calcul confidence.
  Integration         Microsoft Graph mock/sandbox, Storage, Queue, Edge Functions și Ascend adapter.
  RLS/Security        Acces pe roluri, protecția bucketului și imposibilitatea citirii secretelor.
  E2E                 Login → email preluat → extragere → corectare → import → istoric.
  Failure scenarios   Webhook repetat, attachment corupt, AI timeout, Microsoft 429, import Ascend eșuat.

12.3 Date de test necesare
--------------------------

> **•** Minimum 50--100 de emailuri reale anonimizate sau de test, de la
> clienți diferiți.
>
> **•** Minimum 10--15 formate recurente prioritare pentru mapările
> JavaScript.
>
> **•** Exemple PDF digital, PDF scanat, XLSX cu mai multe foi, CSV cu
> separatoare diferite și email fără atașament.
>
> **•** Credențiale/mediu test AscendTMS sau specificația exactă a
> fișierului de import.

+--------+------------------------------------------------------------+
| **13** | **Plan de implementare --- maximum 30 zile**               |
|        |                                                            |
|        | Calendar orientativ, condiționat de acces și datele        |
|        | furnizate la început.                                      |
+--------+------------------------------------------------------------+

  **Interval**    **Activități**                                                                   **Livrabil**
  --------------- -------------------------------------------------------------------------------- -----------------------------------
  Zilele 1--3     Setup repo, Supabase, schema DB, Auth, RLS, design system și medii.              Bază tehnică funcțională.
  Zilele 4--8     Frontend: layout, sidebar, dashboard, inbox, formulare și stări UI.              Interfață conectată la date seed.
  Zilele 6--12    OAuth Microsoft, webhook, subscription, sincronizare și Storage.                 Emailuri reale în aplicație.
  Zilele 10--17   Parsere JS/TS, Excel/CSV/PDF digital, schema normalizată și confidence.          Extragere deterministică.
  Zilele 14--20   Agent AI, mod hibrid, retry, queue, loguri și validare manuală.                  Extragere completă MVP.
  Zilele 18--23   Adapter AscendTMS, import/export, confirmare și istoric.                         Flux end-to-end.
  Zilele 22--26   Rapoarte, setări, utilizatori, notificări și audit.                              Modulele MVP complete.
  Zilele 27--30   QA, securitate, testare cu date reale, bug fixing, deployment și documentație.   MVP livrat în producție.

13.1 Condiții pentru respectarea termenului
-------------------------------------------

> **•** Acces de administrator Microsoft 365/Azure Entra și inboxul de
> test sunt oferite în primele zile.
>
> **•** Exemplele de comenzi și mapările prioritare sunt furnizate
> înainte de începerea motorului de extracție.
>
> **•** Metoda de integrare AscendTMS este confirmată cel târziu în
> prima săptămână.
>
> **•** Feedbackul asupra UI și fluxurilor este oferit în maximum 24--48
> de ore pe etapă.
>
> **•** Funcționalitățile noi apărute după aprobarea brief-ului sunt
> tratate ca change request.

13.2 Livrabile developer
------------------------

> **•** Cod sursă frontend și Supabase Functions într-un repository
> controlat de beneficiar/proiect.
>
> **•** Migrații SQL, politici RLS, seed data și instrucțiuni de
> configurare locală.
>
> **•** Fișier .env.example fără secrete și listă completă de variabile
> necesare.
>
> **•** Documentație pentru OAuth Microsoft, reînnoirea subscripțiilor
> și troubleshooting.
>
> **•** Documentație pentru adăugarea unui parser nou și schimbarea
> promptului/schemei AI.
>
> **•** Teste automate, checklist de deployment și proces de rollback.
>
> **•** Conturi/roluri de test și ghid scurt pentru Admin și Operator.

+--------+------------------------------------------------------------+
| **14** | **Decizii deschise și checklist de pornire**               |
|        |                                                            |
|        | Elemente care trebuie clarificate înainte de dezvoltare    |
|        | sau în prima săptămână.                                    |
+--------+------------------------------------------------------------+

14.1 Decizii obligatorii
------------------------

  **Întrebare**                        **Opțiuni / recomandare**
  ------------------------------------ -----------------------------------------------------------------------------------------------------------
  Ce inbox se conectează?              Mailbox individual sau shared mailbox. Recomandare: inbox dedicat comenzilor.
  Ce mod de autorizare Microsoft?      Delegated pentru demo/MVP rapid; application permission pentru shared mailbox și operare organizațională.
  Ce furnizor AI?                      Configurabil prin backend; răspuns JSON strict și fără dependență în UI.
  OCR în MVP?                          Includeți numai dacă există suficiente PDF-uri scanate; altfel marcați pentru validare manuală.
  Cum se integrează AscendTMS?         API, CSV/Excel sau export pregătit. Se validează printr-un spike tehnic.
  Când se trimite confirmarea?         Manual după import sau automat după import reușit; recomandare MVP: manual cu template.
  Cât timp se păstrează documentele?   Recomandare inițială: 365 zile, configurabil conform politicilor MVT.

14.2 Checklist înainte de kickoff
---------------------------------

> **•** Tenant ID, Client ID, Client Secret și redirect URLs pentru
> aplicația Microsoft Entra.
>
> **•** Adresa inboxului și cont de test cu emailuri/atașamente
> reprezentative.
>
> **•** Acces la proiectul Supabase și regiunea aleasă pentru date.
>
> **•** Lista exactă a câmpurilor AscendTMS și metoda de
> integrare/import.
>
> **•** Template-ul emailului de confirmare către client.
>
> **•** Lista operatorilor și administratorilor inițiali.
>
> **•** Regulile de retenție și politica internă pentru date/documente.

+----------------------------------------------------------------------+
| **! Definition of Ready**                                            |
|                                                                      |
| Dezvoltarea integrării Outlook și AscendTMS începe numai după ce     |
| accesul și metoda tehnică au fost validate. Lipsa acestor elemente   |
| nu trebuie compensată prin presupuneri în cod.                       |
+----------------------------------------------------------------------+

14.3 Referințe tehnice oficiale
-------------------------------

**• Microsoft OAuth 2.0 Authorization Code Flow:**
[[https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow]{.underline}](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)

**• Microsoft Graph --- Outlook change notifications:**
[[https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview]{.underline}](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview)

**• Microsoft Graph --- Webhook delivery:**
[[https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks]{.underline}](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)

**• Supabase Edge Functions:**
[[https://supabase.com/docs/guides/functions]{.underline}](https://supabase.com/docs/guides/functions)

**• Supabase Queues:**
[[https://supabase.com/docs/guides/queues]{.underline}](https://supabase.com/docs/guides/queues)

**• Supabase Cron:**
[[https://supabase.com/docs/guides/cron]{.underline}](https://supabase.com/docs/guides/cron)

**• Supabase Row Level Security:**
[[https://supabase.com/docs/guides/database/postgres/row-level-security]{.underline}](https://supabase.com/docs/guides/database/postgres/row-level-security)

**• Supabase Storage access control:**
[[https://supabase.com/docs/guides/storage/security/access-control]{.underline}](https://supabase.com/docs/guides/storage/security/access-control)

**APROBARE BRIEF MVP**

  **Pentru MVT World of Logistics**                                      **Pentru AIAutomatizari**
  ---------------------------------------------------------------------- ----------------------------------------------------------------------
  Nume / Funcție: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_   Nume / Funcție: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
  Data / Semnătură: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_     Data / Semnătură: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
