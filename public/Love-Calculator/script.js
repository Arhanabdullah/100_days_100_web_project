// Import and initialize the Appwrite client
const client = new Appwrite.Client();

client
    .setEndpoint("https://cloud.appwrite.io/v1") // Replace with your Appwrite endpoint
    .setProject("6780f44100185074ad33"); // Replace with your project ID

// Initialize the Databases module
const databases = new Appwrite.Databases(client);

// Define Database and Collection IDs
const databaseId = "6780f5140020681e525e"; // Replace with your Appwrite database ID
const collectionId = "6780f564000eb2946fc7"; // Replace with your Appwrite collection ID

window.onload = function () {
    const button = document.getElementById("calculate");
    button.addEventListener("click", calculateLove);
};

document.getElementById("reset").addEventListener("click", function() {
    document.getElementById("fname").value = "";
    document.getElementById("cname").value = "";
    document.getElementById("result-message").innerHTML = "";
    document.getElementById("result-percentage").innerHTML = "";
    document.getElementById("calculate").classList.remove("hidden");
    document.getElementById("reset").style.display = "none";
});

function calculateLove() {
    const yourName = document.getElementById("fname").value.trim();
    const crushName = document.getElementById("cname").value.trim();

    if (yourName && crushName) {
        // Use the provided formula to calculate the love index
        const combined = yourName + crushName;
        const letterCounts = {};

        for (const letter of combined) {
            letterCounts[letter] = (letterCounts[letter] || 0) + 1;
        }

        // Sum of all letter counts
        const sum = Object.values(letterCounts).reduce((a, b) => a + b, 0);

        // Convert sum to a percentage
        const loveIndex = sum % 101;

        // Display the result
        let emoji = "";
        let msg = "";
        if (loveIndex <= 30) { emoji = "💔"; msg = "Not a great match!"; }
        else if (loveIndex <= 60) { emoji = "💛"; msg = "There's potential!"; }
        else if (loveIndex <= 90) { emoji = "💕"; msg = "Great match!"; }
        else { emoji = "❤️‍🔥"; msg = "Soulmates!"; }

        document.getElementById("result-message").innerHTML = 
            `${emoji} <strong>${loveIndex}%</strong> ${emoji}`;
        document.getElementById("result-percentage").innerHTML = 
            `${yourName} & ${crushName} — ${msg}`;

        document.getElementById("calculate").classList.add("hidden");
        document.getElementById("reset").style.display = "block";
    }
}
