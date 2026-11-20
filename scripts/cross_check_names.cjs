const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rawNames = `DHANUSH
PAVITHRA
SANTHOSH KUMAR
VAISHNAVI
DHARUN S
NANDHA BALAN
P.SANTHOSH KUMARAN
R.NIVAS
CHANDRA KIRAN
RAMKUMAR
SUJIMITHA
SIBI AKASH
ANTHONY INFANT
ANBARASU
MAHESAN
RAJA SURYA
GOKUL KRISHNAN
HARI JAYARAJ
JAYARAM
MOHAMED IBRAHIM
SAKTHIVEL
SAMFELIX
SIVAPRASANTH
SUTHIKSHAN
VIGNESH
SUBASH
SURYA PRASANTH
GOKUL
KAMALESH
PATRAJOY RIANG
RITENJOY RIANG
ADITHYA
ANAND
CHINNARAJA
MARIMUTHU
MOHAMED GAIF
MURUGAN
MUTHURAMAN
PONNUDURAI
SIVAKUMAR
VIGNESH
MUKUNDHAN
RAMAR
SRIDHARAN J
SURYAKIRAN R
KAVICHAKRAVARTHY
MAANICKAVAASAGAM
AJAIVIKRAM
INDIRAJITH
SIVA
STANLEY
SURRENDAR
THIRUMURUGAN
K K SEDHUPATHI
VISHNU RAJ V
NISWAN
AADHIDHARSHAN
ADITHYA M
AHMED YASEEN
AMMONE
ARIVAMUTHAN
ARJUN
BARANIDHARAN
DEEPAK
GUNASEKARAN G
KAVIBHARATHI
LOKESHWARAN
MANIVEL
MURUGARAJ
RANJITH KUMAR
ROHITH
SABARINATHAN
SHRINIRAJ
THARUNRAJAN
KARTHICK
MUNIRAJ
NISHANTH
SRIRAMASANJEEVAN
SUDHARSAN
RAVI
HARIPRASANNA
ARDEEPAN
HARIPATHMANATHAN
MANOJ KUMAR
SUTHIR
PRAVIN
SRI RAJA
KALIDAS
S.VIGNESH
ANUP KUMAR
MANNU KUMAR
PANKAJ KUMAR
RAS BIHARI
JEEVA PRASANTH
GIRIPRASATH
SRIKANTH
KISHORE KANNA
ALEN THANKACHAN
ARIVANATHAN
ASWAN
ASWATH
CHANDRU
DHARINEESH
DHARSAN
GEETHAI PRIYAN
LOGESHWARAN
RAM
SAKTHIVEL
VINOTH KUMAR
BASUDED
SAMA CHARAN REANG
DHARSHAN
KAVI KUMAR
THIRUVENGADAM
AJMEER KAJA
AKASH M
AKASH S
RAMESH
SHANMUGAM
SHANMUGAMPRIYAN
SRI NIVASH
THARUNIESVAR
MANIKANDAN
BALA SUNDAR
AKASH
KIRUTHIK
KAMALI
MADHAN
SENTHIL KUMAR
SAMBATH KUMAR
GOKUL BALAN
NAVEEN
VIGNESH
HOPNA HEMBROM
MUKESH SOREN
RAJENDRA HEMBROM
RAKESH CHAUDHRI
SRIKANTA PAIK
ABINAYA
HARISHMA
JENIFER
KAVIN
KOWSALIYA
SAJITHA
SHABNASRI
SREERAG
VENNILA
YARSHINI
CHANDAN MANJHI
JAYAPRAKASH
KAUSHAL MANJHI
VISHAL MANJHHI
DHARISH
DIGAMBER BHAI
HARIDEV CHAUDHARY
HARINITHA
KISHORE
KISHUN ORAON
LOKANTH YADEV
MADHAN S
MILAN
MITHUN AGASH
MOHAMMED ARZATH
MOHANAN MURALI
NARUN
PERARASU
SANTHOSH
SHANKAR
SONU CHAUDHARY
TAMIL SELVAN
TELESFOR BARLA
THARUNIKA
VISHAL
AKASH
KATHIRVEL
AJAY
DHARANEESH
MADHAN
PARAMAGURU
MONICKABALAJI
AKSHOYRA  RIANG
BIMAN RIANG
ROTNOJOY
SAMAI ROY RIANG
ASWIN
DURKA LAKSHMI
YAMUNA
RAJESH KANNAN
THIYAGARAJAN
RAJESH KUMAR
ABHINESH
RAKUL
RASARATHINAM
DHARANIVEL
SAM
VIGNESH S
CHAKARAVARTHI
SANTHOSH
SHANMUGAM
SANJAY
RAJDEV CHAUDHARI
SITU KUMAR
BOBY KUMAR
NIRAJAN KUMAR
BASLEEN
GOKUL SAMY
JAGADESSH
BIBAKANAND KUMAR
ROHITH KUMAR NAYAK
BUDU PAIKA
PRATHAP
GOWSITH
BADMAPRIYAN
KAVI ARASU
SRIDHAR
ALAGESH
SAM KUMAR`;

const inputNames = rawNames.split('\n').map(n => n.trim()).filter(Boolean);
console.log('Count of input names:', inputNames.length);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function crossCheck() {
  const { data: dbEmployees, error } = await supabase.from('employees')
    .select('id, employee_code, first_name, last_name, display_name, employment_status')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  console.log('DB employees count:', dbEmployees.length);

  // Normalize string for fuzzy/clean matching
  const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const dbMatched = new Set();
  const inputMatched = [];
  const inputUnmatched = [];

  for (const inputName of inputNames) {
    const cInput = clean(inputName);
    // Find candidate in DB
    const found = dbEmployees.find((e, idx) => {
      if (dbMatched.has(e.id)) return false; // avoid double claiming
      const cFirst = clean(e.first_name);
      const cLast = clean(e.last_name);
      const cFull = clean(`${e.first_name || ''} ${e.last_name || ''}`);
      const cDisplay = clean(e.display_name);

      return cFull === cInput || cDisplay === cInput || cFirst === cInput || 
             cFull.includes(cInput) || cInput.includes(cFull) ||
             (cLast && cInput.includes(cLast) && (cFirst && cInput.includes(cFirst)));
    });

    if (found) {
      dbMatched.add(found.id);
      inputMatched.push({ input: inputName, db: found });
    } else {
      inputUnmatched.push(inputName);
    }
  }

  console.log(`Matched: ${inputMatched.length} / ${inputNames.length}`);
  console.log('Unmatched Input Names:', inputUnmatched);

  const dbUnclaimed = dbEmployees.filter(e => !dbMatched.has(e.id));
  console.log('DB Unclaimed Employees (' + dbUnclaimed.length + '):', dbUnclaimed.map(e => `${e.employee_code}: ${e.first_name} ${e.last_name}`));
}

crossCheck().catch(console.error);

