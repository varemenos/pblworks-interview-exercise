# Intro

I've had to make some decisions on how to approach the solution but also, demonstrate some of my software engineering knowledge. Below you'll find the decisions I had to make.

## Results, for type safety

Errors are a second class citizen in TypeScript, due to it's "backwards compatible with JavaScript" goal.

When you catch an error, the type of the given parameter is "unknown". The reason for that is because in JavaScript and hence in TypeScript you can throw anything, an Error, an Object, a Number, anything really. But once you catch it, if it's of type unknown, the whole point of typing is thrown out the window. With Results, a fairly common practice in other languages like Rust and Go, we stop throwing and catching exceptions and instead return successful or failed outcomes.

You can find an example of this in the update-project action (which creates results based on the request) and EditProjectForm (which requests and then consumes the results).

## Pattern matching with ts-pattern

In frontend development and especially in React, you'll constantly see components that can be in different visual states based on different parts of its and it's ancestors' state. Usually we start by using an if or a switch, but slowly but surely it starts nesting making the logic convoluted and hard to follow. Pattern matching is still a niche but slowly starting to trend. It is a way to describe, `match` different states based on what you described, and ultimately render the correct bit of UI. But the important part is that each description you can match lives in the same place, making it much easier to reason with.

You can see a practical example of this in the StatusIcon.tsx component.

## Part 2 solution

I decided to add versions to the Project documents. This way we can easily identify whether they have been changed or not. I also introduced a debouncer lib to limit the amount of requests that can happen at most once per 1.5 seconds. The requests get cancelled while the user is typing, and once the typing stops, a save action is attempted. Using the version and the debouncer we can achieve the following behavior:

1. assuming they are all in the update project page
2. and no data transfer/network issues occur

- If the user is looking at a Project with the latest version, and they attempt to update it, it should succeed. A success icon will be visible but subtle (the user should be given the impression and feeling that typing gets their work saved by default, if an issue occurs they'll be notified).
- if the user is looking at a Project, and they attempt to update it but the Project they have loaded is no longer the latest one stored (because either they opened the update project page a long time ago or because someone else updated it in the meantime), then they'll see a (conflict resolution) banner. It'll inform them of the issue (that they are trying to update the Project but they are editing an outdated version of it) and then ask them whether they want to "force update it anyway" (if they decide that their work should be the latest) or refresh the loaded Project with the latest data from the backend.
- For a more advanced solution, read the "Future improvements and alternative approaches" section right below.

I also added a navigation guard in case they try to close the tab while having unsaved work.

### Future improvements and alternative approaches

Based on the importance of the feature, product vision, and resources we could have taken widely different approaches and/or added more features to enhance the current iteration:

#### Validation

Limit the type, amount and parameters allowed to be passed to the endpoint from the client to avoid awkward/unexpected situations. Both FE and BE should validate the document and if something is wrong, inform the user of the issue.

#### What we got so far

The one we currently implemented for the assignment, simply adds versioning to the document and utilizes optimistic concurrency control when someone tries to update the Project after it has already been updated. This is very easy to implement, maintain and works perfectly fine if the documents being edited are infrequently updated and/or changed by a small number of people.

To improve it we could have added snapshot diffing, to visualize changes made with each iteration of the Product document.

#### Real-time

If the complexity increases by for example having multiple people editing the document at the same time, or if we want to improve the cross-device UX, we could start by introducing a sync engine to the system. With a synchronization system in place (and a transport method of choice WebSockets, HTTP etc), we can coordinate state with the client in real-time.

#### Multi user, conflict free, real-time document editing

If we want to add real-time, multi-user capabilities, then we'll have to implement something along the lines of OT (Operational Transformations) or CRDT (Conflict-free Replicated Data Types) on top of our sync engine that are frequently used for real-time collaborative documents and concurrent edits (Google Docs and other services of this kind usually end up implementing one or a combination of the following). They are great algorithms for merging operations performed by multiple people at once.
