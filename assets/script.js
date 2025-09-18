emailjs.init("xRjqq8M6BdqjY7aZI");

document.getElementById("notify-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const form = this;
  const emailInput = form.querySelector("input[name='user_email']");
  const email = emailInput.value.trim().toLowerCase();

  // Check if email already submitted
  let submittedEmails = JSON.parse(localStorage.getItem("submittedEmails")) || [];

  if (submittedEmails.includes(email)) {
    alert("You already applied to notifying.");
    return;
  }

  emailjs.sendForm("service_hnn88td", "template_3z8obid", form)
    .then(() => {
      alert("Thanks! We'll notify you.");
      submittedEmails.push(email);
      localStorage.setItem("submittedEmails", JSON.stringify(submittedEmails));
      form.reset();
    }, (error) => {
      console.error("FAILED...", error);
      alert("Something went wrong. Please try again later.");
    });
});
