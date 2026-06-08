(function (window, undefined) {
  window.Asc.plugin.init = function () {
    window.Asc.plugin.executeMethod(
      "GetAllComments",
      null,
      function (comments) {
        console.log(comments);
        const blob = new Blob([JSON.stringify(comments)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        URL.revokeObjectURL(url);
        window.Asc.plugin.executeCommand("close", "");
      },
    );
  };

  window.Asc.plugin.button = function (id) {
    this.executeCommand("close", "");
  };
})(window, undefined);
