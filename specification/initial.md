Creating a chrome extension for helping someone with data entry. Specific case is entering data about a person in family search. The tool in question will enable a person to enter information about a person, then use the existing website functionality to see if the person is a match to an existing or create a new. If creating a new person, they'd like to also click on forms to add the person's parents. 

The user wants to keep control of the decisions and only wants help entering data into the fields. 

The features and flow as I see it are following:
1. Using the extension pop-up UX add some data (csv text pasted in)
2. Extend the website for "add unconnected person" with a button for "fill <next name> from data"
3. Extend the website for "adding a parent" with a button for "fill <next parent name> from data"

Internally a cursor will be kept marking which record and which parent is next. 

This repo will have a script that will produce a ready to share "zip" file that is a ready to install chrome extension.

This extension will have an easy to maintain and update structure, documentation, and technologies - such that an automated process could use claude to add new features as needed.

We will stick to the current purpose of helping Chris Stevenson with his genealogy efforts.

There is a condition where if the person already exists he will just manually attach a source without help from the chrome extension. If the person doesn't exist then he will create them and then add parents. The add parents flow is nearly identical to the add person flow. The form looks nearly identical as well. Since we are not actually calling any apis and we are just filling in these forms when the user clicks the button to get the next name filled into the form. There will need to be logic to determine if the user is on a "add parent flow". If yes then the last person filled from the data will be the child and they will share a last name. He likes to do the child's birthdate minus 20 years and use "abt 1730". The parents data then is derived from the data about the child.

Again the user drives the flow and the extension just adds a button to each of the two flows of adding an unnconnected person and the add parent flow. We'll need to figure out the best way to identify that we are in those flows. 

Within this form there are two special fields. "Date" and "Place". The field doesn't just want a simple value in this field, but instead wants a very complicated value that is the response from an API. For example date takes some text 1755 and then calls an API to fetch possible "dates" for that. Some examples of that are in web_requests. Similarly for place some text is used to list a bunch of possible standardized places and then the user is supposed to select one and it goes into the field. For us it is always that first Illogan one. It will interesting if we can figure out a way to directly input the complicated data into these fields without going through their UX experience to select them. I don't know where it is storing the extra data collected. The value of the field is just 1755, but what get's posted is all the data needed that was from the response of the data text->formalized api. It may be tricky to find that out.

Let's identify open questions and make a plan to figure out what we need to make this work.

