const fs = require("fs");
const md5File = require('md5-file/promise');
const sqlite3 = require('sqlite3');
const Tokenizer = require('tokenize-text');
const tokenize = new Tokenizer();
const tokenizeEnglish = require("tokenize-english")(tokenize);

//create database to store file information
let db = new sqlite3.Database('lab3table.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
  });

    console.log(`A row has been inserted`);
 

// creates hash of each file
async function readability(filename, callback) {
    fs.readFile(filename, "utf8", (err, contents) => {
        if (err) throw err;

        let filehash = "";

        //check for hash
        md5File(filename).then(hash => {
            filehash = hash; 
            console.log(`The MD5 sum of ${filename} is: ${hash}`)
            checkhash(filename, contents, hash)
            })

        })
        callback({test: "File valid"});
    }

//checks if file has been hashed already
function checkhash(filename, contents, hash) {


          
    //return whatever file comes up under that hash from SQL
    db.get(`SELECT Lettercountcol, Numcountcol, Charcountcol, Wordcountcol, Sentencecountcol, Colemancol, ARIcol FROM LongReadings WHERE Hashcol = ?`, [`${hash}`], (err, row) => {
        if (err) {
          console.log("oops");
          createHash(filename, contents)
        }
        return row
          ? 
          console.log("letter count: " +row.Lettercountcol +
                        "\nnum count: " + row.Numcountcol+
                        "\nchar count: " + row.Charcountcol+
                        "\nword count: " + row.Wordcountcol+
                        "\nsentence count: " + row.Sentencecountcol+
                        "\nColeman: " + row.Colemancol+
                        "\nARI: " + row.ARIcol)
            //if hash isn't in SQL table, call function to run calculations and create row
          : createHash(filename, contents, hash);
       
      });
}



        

//if file not yet in SQL, run calculations and add row
function createHash(filename, contents, hash) {

        //tokenize characters
        let chartokens = tokenize.characters() (contents);
        let notcharcount = chartokens.length;

        let numcount = 0;
        let lettercount = 0;
        var j;
        for (j = 0; j < notcharcount; j++){
            //count characters that are numbers
            if ( chartokens[j].value.includes("0"||"1"||"2"||"3"||"4"||"5"||"6"||"7"||"8"||"9")) {
                numcount ++;
            }
            //count characters that are letters
            if ( chartokens[j].value.match(/[A-Z|a-z|ü|é]/i)) {
                lettercount ++;
            }
            
           
        }
        console.log("letter count: " +lettercount);
        console.log("num count: " +numcount);
        //actual char count is letters + numbers
        let charcount = lettercount + numcount;
        console.log("char count: " + charcount);
 

        //tokenize words
        let wordtokens = tokenize.words() (contents);
        let wordcount = wordtokens.length;
        console.log("word count: " + wordcount);

        //tokenize sentences
        let sentencetokens = tokenizeEnglish.sentences()(contents);
        let notsentencecount = (sentencetokens).length;
    
        //determine how many "sentences" are just phrases ending in "\n"
        let entercount = 0;
        var k;
        for (k = 0; k < notsentencecount; k++){
            if ( sentencetokens[k].value.includes("\n")) {
                entercount ++;
            }
        }
       
        //get actual sentence count by subtracting the "sentences" that are just new lines
        let sentencecount = notsentencecount - entercount;
        console.log("sentence count: " + sentencecount);

        //run calculations for readability 
        let coleman = colemanLiau(lettercount, wordcount, sentencecount);
        let ARI = automatedReadabilityIndex(lettercount, numcount, wordcount, sentencecount)
        console.log ("Coleman: " + coleman);
        console.log ("ARI: " + ARI);

        
        
        //insert row into SQL with all information about this text file
        db.run(`INSERT INTO LongReadings(Name, Lettercountcol, Numcountcol, Charcountcol, Wordcountcol, Sentencecountcol, Colemancol, ARIcol, Hashcol) 
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`, [`${process.argv[2]}`, `${lettercount}`, `${numcount}`, `${charcount}`, `${wordcount}`, `${sentencecount}`, `${coleman}`, `${ARI}`, `${hash}`], function(err) {
            if (err) {
              return console.log(err.message);
            }
        }); 
    }
  
// Computes Coleman-Liau readability index
function colemanLiau(letters, words, sentences) {
    return (0.0588 * (letters * 100 / words))
        - (0.296 * (sentences * 100 / words))
        - 15.8;
}

// Computes Automated Readability Index
function automatedReadabilityIndex(letters, numbers, words, sentences) {
    return (4.71 * ((letters + numbers) / words))
        + (0.5 * (words / sentences))
        - 21.43;
}

// Calls the readability function on the provided file and defines callback behavior
if (process.argv.length >= 3) {
    readability(process.argv[2], data => {
        console.log(data);
    });
}
else {
    console.log("Usage: node readability.js <file>");
}

	

//close database
/*
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Close the database connection.');
});
*/