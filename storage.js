export function exportCharacters(characters) {
  const blob = new Blob([JSON.stringify(characters, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dsa_characters.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importCharacters(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      callback(data);
      alert("Import erfolgreich!");
    } catch (err) {
      alert("Ungültige JSON-Datei");
    }
  };
  reader.readAsText(file);
}
