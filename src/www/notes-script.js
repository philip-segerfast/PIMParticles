//#region VARIABLER
// Hämtar user.id samt username ifrån localStorage för att kunna använda den på denna sidan
let loggedUserID = localStorage.getItem("user");
let loggedUserName = localStorage.getItem("username");

// alla note-objekt från servern.
let notes;
let selectedNoteID;

// Skapar Quill redan här, för att kunna nämna den i annan kod
let quill = null;

// Importerar olika färger från CSS
let colFocus = getComputedStyle(document.documentElement)
.getPropertyValue('--header-button-selected');
let colFocus2 = getComputedStyle(document.documentElement)
.getPropertyValue('--header-button-selected-hover');

let colBlackText = getComputedStyle(document.documentElement)
.getPropertyValue('--text-black');

let colMedEmphText = getComputedStyle(document.documentElement)
.getPropertyValue('--text-med-emphasis');
//#endregion

//#region UPPDATERA, SORTERA OCH VISA NOTES 
// Uppdaterar ändringar, och visar alla notes
async function updateAndRenderNotes() {
    if(quill == null) {
        initializeEditor();
    }
    await updateNotes(false);
}

// Uppdaterar listan med alla notes genom att kontakta servern
// för att få ut dom från databasen
async function updateNotes(isSelected) {
   let serverAnswer = await fetch("/rest/notes/" + loggedUserID);
   let json = await serverAnswer.json();
   notes = json.data;
   
   sortNotesList();

   renderNotesList();
   if(isSelected){
       renderNoteContent(selectedNoteID, isSelected);
       noteClicked(selectedNoteID);
   }
}

// Lägg till Content från vald note till Quill
//Ändrar headern ovanför quill till rätt Header
function renderNoteContent(noteID, isSelected) {
    
    selectedNoteHeader = getHeader(noteID);

    let headerList = document.querySelector(".note-header");
    headerList.innerHTML = `${selectedNoteHeader}`;
    if(isSelected){
        try{
            let strContent = getContent(selectedNoteID);
            let delta = JSON.parse(strContent);
            quill.setContents(delta);
        }catch(err){
            quill.setContents("");
        }
    }else{
        headerList.innerHTML = "";
        quill.setContents("");
    }
}

// En funktion för att skriva ut alla notes i HTML, har ID'n "para", går bra att byta
function renderNotesList() {
    let navHeader = document.querySelector(".nav-header");

    navHeader.innerHTML = loggedUserName + "'s notes";

    let HTMLNoteList = document.querySelector("#para");

    HTMLNoteList.innerHTML = "";
    
    for(let note of notes) {
        let noteLi = `
                <div id="notes">
                    <button title="${note.last_update}" onclick="noteClicked(${note.id})" class="header-button hover-shadow" 
                    id="header-buttons hButton${note.id}" name="hButton" onmouseover="buttonHover(this, true)" onmouseout="buttonHover(this, false)" data-id="${note.id}">
                        ${note.header}
                    </button>
                </div>`;

        HTMLNoteList.innerHTML += noteLi;
    }

    let htmlNotes = document.getElementsByName("hButton");
    let topNoteID = htmlNotes[0].dataset.id;
    
    renderNoteContent(topNoteID, true);
    noteClicked(topNoteID);

}

// Sortera listan av notes efter datum
function sortNotesList(){
    notes.sort(GetSortOrder("last_update"));
}

// Funktionen för att sortera
function GetSortOrder(prop) {    
    return function(a, b) {    
        if (a[prop] > b[prop]) {    
            return -1;    
        } else if (a[prop] < b[prop]) {    
            return 1;    
        }    
        return 0;    
    }
}

// Funktion för att rita upp Save och Reset knappen, så att dom inte renderas från start
function renderSaveResetButtons(){
    let srButtons = document.querySelector("#buttons-container");
    srButtons.innerHTML = `
    <button class="standard-button save-button" onclick="saveNote()" title="Hover text">
        Save<div class="fa fa-save"></div>
    </button>
    <button class="standard-button" onclick="resetNote()">
        Reset<div class="fa fa-refresh" title="Hover text"></div>
    </button>
    `;
}
//#endregion

//#region EDITOR
// Definierar Quill
function initializeEditor() {
    let toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],
      
        [{ 'header': 1 }, { 'header': 2 }],               // custom button values
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
        [{ 'direction': 'rtl' }],                         // text direction
      
        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      
        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'font': [] }],
        [{ 'align': [] }],
        [ 'image' ],
      
        ['clean']                                         // remove formatting button
      ];

    quill = new Quill('#quill-editor', {
        modules: {
          toolbar: {
              container: toolbarOptions,
              handlers: imageHandler
          }
        },
        scrollingContainer: '#scrolling-container',
        theme: "snow"
    });

    toggleEditor(false);
}

// Toggle som styr om Quill ska visas eller inte
function toggleEditor(isHidden){
    let x = document.getElementById("quill-editor");
    if(isHidden){
        x.style.display = "block";
    }else{
        x.style.display = "none";
    }
}

// Constant för att kunna spara en bild från en URL
const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async function() {
      const file = input.files[0];
      console.log('User trying to uplaod this:', file);

      const id = await uploadFile(file); // I'm using react, so whatever upload function
      const range = this.quill.getSelection();
      const link = `${ROOT_URL}/file/${id}`;

      // this part the image is inserted
      // by 'image' option below, you just have to put src(link) of img here. 
      this.quill.insertEmbed(range.index, 'image', link); 
    }.bind(this); // react thing
  }
  //#endregion

//#region GETTERS
// Hämta all "Content" ifrån en note
function getContent(id) {
    for(note of notes) {
        if(note.id == id) {
            return note.content;
        }
    }
}

// Hämta "Headern" från en note
function getHeader(id) {
    for(note of notes){
        if(note.id == id){
            return note.header;
        }
    }
}
//#endregion

//#region HEADER KNAPPAR SPECIELLA FUNKTIONER
// Vad som händer när man trycker på en note
// Uppdaterar vilken note som är vald, och bytar färg till --header-button-selected
function noteClicked(noteID) {
    toggleEditor(true);
    selectedNoteID = noteID;
    renderNoteContent(noteID, true);
    renderSaveResetButtons();
    
    let x = document.getElementsByName("hButton");
    for(i = 0; i < x.length; i++){
        if(x[i].getAttribute('id') == "header-buttons hButton" + noteID){
            x[i].style.background = colFocus2;
            x[i].style.color = colBlackText;
        }else{
            x[i].style.background = '';
            x[i].style.color = colMedEmphText;
        }
    }
}

// Funktion för att göra så att den valda knappen blir highlighted när man drar musen över den
function buttonHover(x, isHovering){
    if(x.id == "header-buttons hButton"+selectedNoteID){
        if(isHovering)
            x.style.background = colFocus2;
            else
            x.style.background = colFocus;
    }
}
//#endregion

//#region FUNKTIONER FÖR ATT GÖRA ÄNDRINGAR I NOTES
// Återställer alla osparade ändringar
function resetNote(){
    renderNoteContent(selectedNoteID, true);
}

// Sparar den markerade noten
async function saveNote() {
    let savedNote = {
        id: selectedNoteID,
        header: document.querySelector(".note-header").innerHTML,
        content: JSON.stringify(quill.getContents()),
        owner: loggedUserID
    };

    let result = await fetch("/updateNote", {
        method: "PUT",
        body: JSON.stringify(savedNote)
    });

    console.log(await result.text());
    updateNotes(true);
}

// Skapa en ny note
async function createNewNote(){
    let newHeader = "New Note";
    let headerPostfix = 1;
    for(i = 0; i < notes.length; i++){
        if(notes[i].header == newHeader){
            console.log(notes[i].header);
            newHeader = "New Note" + "(" + headerPostfix + ")";
            for(j = 0; j < notes.length; j++){
                if(notes[j].header == newHeader)
                headerPostfix++;
                newHeader = "New Note" + "(" + headerPostfix + ")";
            }
        }
    }
    let newNote = {
        header: newHeader,
        content: "",
        owner: parseInt(loggedUserID)
    };

    let result = await fetch("/createNote", {
        method: "POST",
        body: JSON.stringify(newNote)
    });

    console.log(await result.text());
    updateNotes(false);
}

// Tar bort den markerade noten
async function deleteNote(){
    let savedNote = {
        id: selectedNoteID,
    };

    let result = await fetch("/delete", {
        method: "DELETE",
        body: JSON.stringify(savedNote)
    });

    console.log(await result.text());

    toggleEditor(false);

    updateNotes(false);
}
//#endregion