import { rollD20, processSkillRoll, rollAttribute } from './dice.js';
import { exportCharacters, importCharacters } from './storage.js';

const { useState, useEffect } = React;
const ATTRS = ["MU","KL","IN","CH","FF","GE","KO","KK"];
const singleRollCategories = ["Kampftalente","Sprachen und Schriften","Liturgiekenntnis"];

function App() {
  const [characters, setCharacters] = useState({});
  const [currentChar, setCurrentChar] = useState(null);
  const [skills, setSkills] = useState([]);
  const [log, setLog] = useState([]);
  const [diceResults, setDiceResults] = useState([]);
  const [lastOutcome, setLastOutcome] = useState("");
  const [lastLabel, setLastLabel] = useState("");
  const [activeTab, setActiveTab] = useState("Eigenschaften");
  const [filterCategory, setFilterCategory] = useState("Alle");

  // New skill input states
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("");
  const [newSkillAttr, setNewSkillAttr] = useState("");

  useEffect(()=>{
    fetch("data/talent.json")
      .then(res => res.json())
      .then(data => {
        const allSkills = Object.values(data).flat();
        const saved = localStorage.getItem("dsa_characters");
        if(saved){
          const parsed = JSON.parse(saved);
          setCharacters(parsed);
          const first = Object.keys(parsed)[0];
          if(first){
            setCurrentChar(first);
            setSkills(parsed[first].skills || allSkills);
          }
        } else {
          setSkills(allSkills);
        }
      })
      .catch(err => console.error("Fehler beim Laden von talents.json:", err));
  },[]);

  function saveChars(newChars){ setCharacters(newChars); localStorage.setItem("dsa_characters",JSON.stringify(newChars)); }
  function newCharacter(){
    const name = prompt("Neuer Charaktername:");
    if(!name) return;
    const attrs = {};
    ATTRS.forEach(a=>attrs[a]=12);
    const newChars = {...characters,[name]:{attributes:attrs, skills:skills}};
    setCurrentChar(name);
    setCharacters(newChars);
    saveChars(newChars);
  }
  function deleteCharacter(){
    if(!currentChar) return;
    if(!confirm(`Charakter "${currentChar}" löschen?`)) return;
    const newChars = {...characters};
    delete newChars[currentChar];
    const first = Object.keys(newChars)[0] || null;
    setCurrentChar(first);
    setSkills(first?newChars[first].skills:[]);
    saveChars(newChars);
  }
  function updateAttr(attr,value){
    const updated = {...characters,[currentChar]:{...characters[currentChar],attributes:{...characters[currentChar].attributes,[attr]:parseInt(value)||0}}};
    saveChars(updated);
  }

  function addToLog(entry){ setLog(prev=>[entry,...prev]); }

  function rollSkill(skill,useSpec){
    const numDice = singleRollCategories.includes(skill.category)?1:skill.attr.length;
    const rolls = Array.from({length:numDice},()=>rollD20());
    setDiceResults(rolls.slice());
    const result = processSkillRoll(skill, characters[currentChar].attributes, useSpec, rolls, singleRollCategories);
    setLastLabel(`${skill.name} [${skill.attr.join('/')}] – ${skill.category}`);
    const statusText = result.isCritical
      ? result.criticalText
      : (result.success
          ? `✅ Erfolg (TaP: ${result.tap}, QS: ${result.qs})`
          : `❌ Misslungen (TaP: ${result.tap})`);
    setLastOutcome(statusText);
    addToLog({
      skill: skill.name + (useSpec && skill.spec ? " (Spez)" : "") + " [" + skill.category + "]",
      rolls,
      result: result.isCritical ? result.criticalText : result.success ? `✅ Erfolg (TaP: ${result.tap}, QS: ${result.qs})` : `❌ Misslungen (TaP: ${result.tap})`,
      details: result.details
    });
  }

  function rollAttributeDice(attr){
    const val = characters[currentChar]?.attributes[attr] || 0;
    const result = rollAttribute(val);
    setDiceResults([result.roll]);
    setLastLabel(`Eigenschaft: ${attr} (≤ ${val})`);
    const diff = val - result.roll;
    const statusText = result.critical || (result.success
      ? `✅ Erfolg (Δ: ${diff >= 0 ? '+' : ''}${diff})`
      : `❌ Misslungen (Δ: ${diff})`);
    setLastOutcome(statusText);
    addToLog({
      skill: `Eigenschaft: ${attr}`,
      rolls: [result.roll],
      result: result.critical || (result.success ? `✅ Erfolg (≤ ${val})` : `❌ Misslungen (≤ ${val})`),
      details: result.details
    });
  }

  function addNewSkill(){
    if(!newSkillName || !newSkillAttr){
      alert("Name und Eigenschaften müssen angegeben werden!");
      return;
    }
    const attrArray = newSkillAttr.split(",").map(a=>a.trim());
    const newSkill = {
      name: newSkillName,
      category: newSkillCategory || "Allgemein",
      attr: attrArray,
      value: 0
    };
    const updatedSkills = [...skills, newSkill];
    setSkills(updatedSkills);

    // Save to current character
    const updatedChars = {...characters};
    updatedChars[currentChar].skills = updatedSkills;
    setCharacters(updatedChars);
    localStorage.setItem("dsa_characters", JSON.stringify(updatedChars));
  }

  if(!currentChar) return <div><button onClick={newCharacter}>Neuer Charakter</button></div>;

  const groupedSkills = {};
  skills.forEach(skill => { const cat = skill.category || "Allgemein"; if(!groupedSkills[cat]) groupedSkills[cat]=[]; groupedSkills[cat].push(skill); });
  const skillCategories = ["Alle", ...Object.keys(groupedSkills)];
  const displayedSkills = filterCategory==="Alle" ? skills : groupedSkills[filterCategory] || [];

  return (
    <div>
      <h2>Charakter: {currentChar}</h2>
      <div className="controls">
        <button onClick={newCharacter}>+ Neu</button>
        <button onClick={deleteCharacter}>Löschen</button>
        {Object.keys(characters).length > 1 && (
          <select
            value={currentChar}
            onChange={e=>{
              const selected = e.target.value;
              setCurrentChar(selected);
              setSkills(characters[selected].skills || []);
            }}
          >
            {Object.keys(characters).map(name=>
              <option key={name} value={name}>{name}</option>
            )}
          </select>
        )}
      </div>

      <div className="tabs">
        <div className={"tab "+(activeTab==="Eigenschaften"?"active":"")} onClick={()=>setActiveTab("Eigenschaften")}>Eigenschaften</div>
        <div className={"tab "+(activeTab==="Talente"?"active":"")} onClick={()=>setActiveTab("Talente")}>Talente</div>
        <div className={"tab "+(activeTab==="Würfellog"?"active":"")} onClick={()=>setActiveTab("Würfellog")}>Würfellog</div>
        <div className={"tab "+(activeTab==="Import/Export"?"active":"")} onClick={()=>setActiveTab("Import/Export")}>Import/Export</div>
      </div>

      {activeTab==="Eigenschaften" && (
        <div>
          {ATTRS.map(a=>(
            <div key={a}>
              {a}: <input type="number" value={characters[currentChar].attributes[a]||0} onChange={e=>updateAttr(a,e.target.value)} style={{width:60}} />
              <button onClick={()=>rollAttributeDice(a)}>Würfeln</button>
            </div>
          ))}
          <h4>Letzter Würfelwurf:</h4>
          <div className="dice-row">
            {diceResults.map((d,i)=><div key={i} className="dice-wrapper">{d}</div>)}
            {diceResults.length===0 && <div>Keine Würfe bisher</div>}
          </div>
        </div>
      )}

      {activeTab==="Talente" && (
        <div>
          <label>Filter nach Kategorie: </label>
          <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
            {skillCategories.map(cat=>
              <option key={cat} value={cat}>{cat}</option>
            )}
          </select>

          {displayedSkills.map((skill,idx)=>(
            <div key={idx} style={{marginTop:"8px"}}>
              <strong>{skill.name}</strong> [{skill.attr.join("/")}] 
              TaW: <input type="number" value={skill.value} style={{width:50}}
                onChange={e=>{
                  const newSkills = [...skills];
                  newSkills[skills.indexOf(skill)].value = parseInt(e.target.value) || 0;
                  setSkills(newSkills);
                  const updatedChars = {...characters};
                  updatedChars[currentChar].skills = newSkills;
                  localStorage.setItem("dsa_characters", JSON.stringify(updatedChars));
                }} />
              {skill.spec?`(Spez: ${skill.spec})`:''} [{skill.category}]
              <div style={{marginTop:4}}>
                <button onClick={()=>rollSkill(skill,false)}>Würfeln</button>
                {skill.spec && <button onClick={()=>rollSkill(skill,true)}>Würfeln (Spez)</button>}
              </div>
            </div>
          ))}

          <h4>Neues Talent hinzufügen</h4>
          <div>
            Name: <input type="text" value={newSkillName} onChange={e=>setNewSkillName(e.target.value)} />
            Kategorie: <input type="text" value={newSkillCategory} onChange={e=>setNewSkillCategory(e.target.value)} />
            Eigenschaften (Komma): <input type="text" value={newSkillAttr} onChange={e=>setNewSkillAttr(e.target.value)} />
            <button onClick={addNewSkill}>Hinzufügen</button>
          </div>

          <h4>Letzter Würfelwurf:</h4>
          <div className="dice-row">
            {diceResults.map((d,i)=><div key={i} className="dice-wrapper">{d}</div>)}
            {diceResults.length===0 && <div>Keine Würfe bisher</div>}
          </div>
        </div>
      )}

      {activeTab==="Würfellog" && (
        <div className="log">
          {log.length===0 && <div>Noch keine Würfe</div>}
          {log.map((entry,idx)=>(
            <div key={idx} className="log-entry">
              <strong>{entry.skill}</strong> – Würfe: {entry.rolls.join(", ")}<br/>
              Ergebnis: <span className={entry.result.includes("❌")?"failure":"success"}>{entry.result}</span><br/>
              {entry.details && entry.details.map((d,i)=><div key={i} style={{fontSize:"0.9em", marginLeft:"10px"}}>{d}</div>)}
            </div>
          ))}
        </div>
      )}

      {activeTab==="Import/Export" && (
        <div>
          <h3>Import / Export</h3>
          <button onClick={()=>exportCharacters(characters)}>Exportieren</button>
          <input type="file" accept="application/json" onChange={e=>{
            importCharacters(e.target.files[0], data=>{
              setCharacters(data);
              const first = Object.keys(data)[0];
              setCurrentChar(first);
              setSkills(first?data[first].skills:[]);
              localStorage.setItem("dsa_characters", JSON.stringify(data));
            });
          }} />
        </div>
      )}

      {/* Sticky dice results footer */}
      <div className="dice-sticky">
        <div className="dice-sticky-inner">
          <strong>Letzter Würfelwurf:</strong>
          {lastLabel && (
            <div style={{marginTop:4}}>{lastLabel}</div>
          )}
          <div className="dice-row">
            {diceResults.map((d,i)=>(
              <div key={i} className="dice-wrapper">{d}</div>
            ))}
            {diceResults.length===0 && <div>Keine Würfe bisher</div>}
          </div>
          {lastOutcome && (
            <div style={{marginTop:6}} className={lastOutcome.includes('❌')? 'failure' : 'success'}>
              {lastOutcome}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);


