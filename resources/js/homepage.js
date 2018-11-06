(function () {
    
})();
function GetFile() {
    ReadTextFile("./drive/get?id=", function (response) {
        let urlCreator = window.URL || window.webkitURL;
        let imageUrl = urlCreator.createObjectURL(response);
        let image = new Image();
        image.src = imageUrl;
        document.getElementById("viewport").appendChild(image);
    });
}
function ReadTextFile(file, callback) {
    fetch(file, { cache: "no-store" }).then(function (response) {
        if (response.ok) {
            response.text().then(callback);
        }
    });
}