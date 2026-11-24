# Detailed project brief: Year 10 interactive statistics model

## 1. Project overview

Create a browser-based interactive model that helps Australian Year 10 students understand, calculate and graph key statistics. The model should make the connection between a data set, the numerical statistics calculated from it and the way those statistics appear in visualisations.

The experience has three modes:

- **Learning Mode:** Students edit a data set, see the statistics and visualisations update, and use explanations and worked examples to learn how each statistic is calculated.
- **Practice Mode:** Students receive a randomly generated question and can see its fixed data set. They enter their answers and use those entries to build separate, initially incomplete graphs; the graphs do not automatically plot the data set.
- **Meta Mode:** Automatically displays statistics and graphs for the points earned on submitted Practice Mode questions.

The overall experience should be neat, clear, accurate, well-labelled and suitable for use on computer screens in a classroom.

## 2. Intended students and learning goals

The primary audience is Australian Year 10 students studying statistics. The model should support common classroom learning without needing to target a specific Australian Curriculum outcome.

By using the model, students should be able to:

- Find the mean, mode and median of a data set.
- Find the range, quartiles and interquartile range (IQR).
- Identify outliers using the 1.5 × IQR rule.
- Calculate population standard deviation.
- Identify skew from a box plot and describe it as positive or negative, or as approximately symmetric where appropriate.
- Read, interpret and construct statistical visualisations.
- Explain how the values in a data set relate to the statistics and visualisations.
- Follow the calculation process, rather than relying only on visual interpretation.

## 3. Modes and navigation

Provide clearly labelled controls for **Learning Mode**, **Practice Mode** and **Meta Mode**.

### Switching modes

- Students can switch between all three modes using visible buttons.
- Selecting Learning Mode returns the student to an editable data set and its linked visualisations.
- Selecting Practice Mode starts a new question only when there is no active one; switching back restores the current question and score.
- Keep the cumulative Practice Mode score and current question when students switch modes.
- Award one point per correct answer. Add each submitted question's score to an uncapped cumulative total; each question counts once, and resubmitting replaces that question's previous points.
- Persist the total and per-question score history across page reloads. Provide an explicit reset control that clears the saved history.

### General interface expectations

- Use clear labels, concise instructions and consistent terminology.
- Clearly distinguish the data-entry area, statistic values, explanations, worked examples, graphs and mode controls.
- Keep the rounding note visible but unobtrusive: results are rounded to two decimal places.
- Use a distinct colour for each statistic. Apply that colour consistently to the statistic’s displayed value, formula or explanation, and relevant parts of the visualisations.
- Do not rely on colour alone to communicate meaning. Use text labels and clear graph markers as well.
- Keep all selected visualisations available in Learning Mode. If one is not especially meaningful for the current data, retain it and show a short explanatory note rather than greying it out.

## 4. Data sets

### Learning Mode starting data

- When the browser opens in Learning Mode, show a randomly generated sample data set.
- A context may be shown for the data, but data sets can come from any context.
- The initial data should be suitable for demonstrating the statistics and visualisations clearly.

### Editing data in Learning Mode

Students edit the data by typing a horizontal list of values. They do not edit data points directly on a graph.

The data-entry field should allow students to:

- Add values.
- Change existing values.
- Remove values.
- Enter decimal values.
- Enter repeated values.

The data-entry field should reject negative numbers. It should also handle invalid entries clearly—for example, by identifying the invalid value and explaining that the data must contain non-negative numeric values.

After a valid edit, recalculate and update the data-dependent outputs together:

- The ordered data, if displayed.
- Mean, mode, median, Q1, Q3, IQR and range.
- Outliers and population standard deviation.
- Skew classification or description.
- The box plot.
- The cumulative frequency graph.
- The stem-and-leaf plot.
- Any worked examples opened from the current data.

If the data entry is empty or cannot be parsed, show a clear prompt to enter a valid data set rather than displaying misleading statistics.

## 5. Statistics and calculation conventions

Show the value of each statistic as a number as well as representing it visually wherever relevant. Use the same calculation conventions throughout Learning Mode, Practice Mode and worked solutions.

### Ordering the data

Sort the values from least to greatest before calculating statistics that depend on order, including the median, quartiles, range, outliers and stem-and-leaf plot.

Repeated values must remain in the ordered list and be counted individually.

### Mean

Calculate the arithmetic mean:

\[
\text{mean}=\frac{\text{sum of all values}}{\text{number of values}}
\]

Show the result to two decimal places where rounding is needed.

### Median and quartiles

Use the following quartile method:

1. Order all data values from least to greatest.
2. Find Q2, the median of the complete data set. If there are two middle values, average them.
3. Divide the ordered data into a lower half and an upper half. If the data set has an odd number of values, exclude the overall median from both halves.
4. Find Q1 as the median of the lower half.
5. Find Q3 as the median of the upper half.

Repeated values are separated by their positions in the ordered list, not grouped as one value for purposes of dividing the list into halves.

Display:

- **Q1:** lower quartile; 25th percentile.
- **Q2:** median; 50th percentile.
- **Q3:** upper quartile; 75th percentile.

Use two decimal places where a result is not a whole number.

### Interquartile range

Calculate:

\[
\text{IQR}=Q3-Q1
\]

Explain that the IQR describes the spread of the middle 50% of the data.

### Range

Calculate:

\[
\text{range}=\text{maximum value}-\text{minimum value}
\]

Show the minimum and maximum values as the endpoints used to calculate it.

### Mode

- If one value occurs more often than every other value, display it as the mode.
- If multiple values tie for the highest frequency, display all of them and describe the data as multimodal.
- If every value occurs once, display “No mode—all values occur once.”
- Repeated values must be counted when determining the mode.

### Outliers

Use the 1.5 × IQR rule:

\[
\text{lower fence}=Q1-1.5(\text{IQR})
\]

\[
\text{upper fence}=Q3+1.5(\text{IQR})
\]

A data value is an outlier if it is strictly below the lower fence or strictly above the upper fence.

Show the identified outlier value or values, or clearly indicate that there are none. Where possible, show the fences or explain how the values were compared with them.

### Population standard deviation

Use **population** standard deviation, not sample standard deviation:

\[
\sigma=\sqrt{\frac{\sum (x-\mu)^2}{N}}
\]

Here, \(\mu\) is the population mean and \(N\) is the number of data values. Explain the process in student-friendly terms: find the mean, measure each value’s distance from the mean, square those distances, average them, then take the square root.

Display the standard deviation rounded to two decimal places.

### Skew

In Learning Mode, explain that skew describes the asymmetry of a distribution and that students should judge it from the box plot.

For student answers in Practice Mode, provide these response choices:

- Positive skew.
- Negative skew.
- Approximately symmetric.

Use “approximately symmetric” where the box plot does not show a clear positive or negative skew. Do not force a positive or negative answer when the data does not reasonably support one.

## 6. Learning Mode: explanations and worked examples

For every statistic, provide a short description and a formula or calculation rule. The explanation should be suitable for Year 10 students and should help them learn how to calculate the value.

Include explanations for:

- Mean.
- Mode.
- Median.
- Q1 and Q3 as part of the quartile and IQR explanation (not as separate indicator cards).
- IQR.
- Range.
- Outliers and the 1.5 × IQR rule.
- Population standard deviation.
- Skew.

Place a **?** symbol beside each relevant description. When clicked, it opens a worked example using the student’s current data set. The example should:

- Use the actual values currently entered by the student.
- Show the relevant steps, not just the final answer.
- Use the same conventions and rounding as the model’s displayed answer.
- Update if the data set changes. Do not leave a worked example showing calculations for an earlier data set as if they still applied.

For example, a quartile worked example should show the ordered list, the median, the lower and upper halves, and how Q1 and Q3 are found. An outlier example should show the fences and which values, if any, fall outside them.

## 7. Learning Mode: visualisations

All visualisations should be available in Learning Mode and update together when the data changes. Each graph should have a clear title, labelled axes where applicable, readable values or scales, and a legend or annotations when needed.

If a visualisation is not very informative for the current data set, keep it visible and add a short note explaining why. Do not grey it out.

### Box plot

Place the visualisations above the Learning Mode indicator cards. The box plot should use a horizontal data-value axis, with the box and whiskers drawn above that axis, and should show and label:

- Minimum and maximum values, represented by whiskers or another clearly identified convention.
- Q1.
- Median (Q2).
- Q3.
- IQR, shown as the span from Q1 to Q3.
- Outliers, marked distinctly from non-outlier values when present.

Use the 1.5 × IQR rule to identify outliers. Extend whiskers to the most extreme non-outlier values and mark outliers separately. Label this convention and show the five-number-summary values.

The display should connect the visual markers to the numeric values and to the corresponding colour-coded indicators.

### Cumulative frequency graph

Provide an upward-reading cumulative frequency graph with an ogive line and individual observation points. Do not use columns. Use:

- A labelled horizontal axis for the data values.
- A labelled vertical axis for cumulative frequency.
- Clearly represented data values or class boundaries, as appropriate to the data.
- A clear indication of how cumulative frequency builds across the data.
- Evenly spaced, numeric tick labels on both axes.
- A dashed horizontal guide from half the total frequency to the ogive, followed by a dashed vertical guide to the data-value axis to read the median.
- Quartile readings marked where they can be meaningfully read from the graph.

The graph should remain available even when a small data set makes it less informative, with a brief note explaining that limitation.

In Learning Mode, allow individual observations to be dragged on the box plot, cumulative-frequency graph or distribution curve. Update the source data set, all statistics and every visualisation together.

### Stem-and-leaf plot

Show a correctly ordered stem-and-leaf plot that preserves all repeated values. Include a key that explains how to read a stem and leaf as a data value.

Use the tens value as the stem and the ones value as the leaf. For decimals, retain the fractional part in the leaf and state this convention in the key.

### Mean and mode in the visualisations

Show the mean numerically and mark it on an appropriate visualisation where this is useful. Show the mode numerically and connect it to the data values or frequencies where it occurs. Do not suggest that the mean or mode is directly shown by a box plot if it is not represented there.

### Distribution curve

Show a smoothed curve based on the current data to communicate distribution shape. Label the vertical axis as a scaled relative-density shape guide, and state that the curve is descriptive and does not assume a normal distribution. Mark and label Q1, the median (Q2), Q3, the mean and the mean ± one population standard deviation. Keep the underlying statistics and curve based on the same data set.

## 8. Practice Mode

### Generating a question

When Practice Mode is selected:

- Generate a random data set with no more than 20 values.
- Assign a random context to the data.
- Keep the generated data set fixed for that question.
- Display the generated data set clearly, including repeated values.
- Do not allow the student to edit the generated data set.
- Do not automatically create fully populated graphs from the generated data.

The question should ask the student to calculate and enter:

- Mean.
- Median.
- IQR.
- Range.
- Outlier value or values, or “None.”
- Population standard deviation.
- Skew: positive, negative or approximately symmetric.
- Mode, including “None” where all values occur once and all tied modes where applicable.

### Separate, student-built graphs

Practice Mode graphs are separate from the displayed data set. They start as incomplete or unpopulated visualisations and do not automatically plot the generated data.

- Students do not drag Practice Mode points or graph elements.
- Students enter their calculated indicators into text fields.
- Their entered indicator values update the corresponding graph features.
- The graph is therefore a representation built from the student’s entered answers; it is not a direct plot of the supplied data.
- Make this distinction clear so students can tell their constructed graphs apart from the supplied data set.
- The graphs should respond to entered values in a way that helps students see how their answers relate to the relevant features. For example, entered quartiles can set the quartile markers on the box plot.
- Do not use the graph to silently correct an incorrect answer before submission.
- Do not show cumulative-frequency columns.
- Make the cumulative-frequency graph larger than the box plot.
- Put an accessible help button beside each five-number-summary field label. Explain minimum, Q1, median, Q3 and maximum through these controls rather than a separate summary panel.

### Answer entry and validation

- Provide a clear input for each requested numeric answer.
- Provide a suitable input for skew, using the three response choices described above.
- Allow students to enter decimal answers.
- Apply the same two-decimal rounding convention when checking numeric answers.
- For outliers, allow a comma-separated list of values or “None.”
- For mode, allow a comma-separated list of values or “None.”
- Tell students what format is expected if an entry cannot be interpreted.
- Avoid treating a blank answer as a correct “None” response.

### Submission, feedback and worked solutions

When students submit:

- Mark each answer separately as correct or incorrect.
- Award 1 point for each correct answer, for up to 8 points per question.
- Add each submitted question's points to the cumulative score; do not reset it for a new question or when switching modes.
- Count a resubmitted question once and replace its previous points with the new result.
- Show the cumulative point total and the number of submitted questions contributing to it.
- Show the correct answer for each item.
- Reveal a worked solution that explains how the correct answer was calculated from the displayed data.
- Use the same calculation methods as Learning Mode.
- For skew, explain the box-plot evidence for the correct classification.
- For outliers, show the fences and the comparison that identifies the outlier values, or explains why there are none.

## 9. Meta Mode

- Use each submitted Practice Mode question score (0–8) as one data value.
- Show the score values by question, cumulative points and number of submitted questions.
- Automatically update the box plot, cumulative-frequency graph, stem-and-leaf plot, distribution curve and statistics as scores are added or a current question is resubmitted.
- Do not use cumulative-frequency columns or user-editable graph inputs in Meta Mode.

## 10. Rounding and display rules

- Round calculated results to two decimal places.
- Show a small note in a corner stating that results are rounded to two decimal places.
- Use the same rounding rule in displayed answers, worked examples, graph labels where appropriate, and Practice Mode answer checking.
- Preserve the underlying calculation precision as needed so that rounding intermediate values does not create inconsistent results. Round the final displayed result.
- Keep whole-number results readable without unnecessary decimal digits, unless a consistent two-decimal display is preferred across the interface.

## 11. Accuracy and consistency requirements

- Use the same data, calculation conventions, rounding and outlier rule in every part of the model.
- Ensure that the displayed statistic values agree with the visualisations.
- Ensure that all repeated values are included in calculations, plots and frequency counts.
- Ensure that Practice Mode worked solutions are based on the displayed data set, not the student’s entered answers.
- Do not allow Practice Mode’s student-built graphs to imply that they directly plot the supplied data.
- Ensure that each completed Practice Mode question contributes exactly one score value to Meta Mode.
- Ensure that dragging an observation in Learning Mode updates the same underlying data value and every dependent output.
- Explain any visualisation limitations with a short, understandable note rather than hiding the visualisation.
- Keep labels and indicator colours consistent across the interface.

## 12. Scope and constraints

- The model is browser-based and intended for computer screens.
- Offline use is not required.
- No accessibility requirements have been specified for this brief.
- Cumulative score history persists across page reloads until the student activates the score reset control.
- Learning Mode chart observations are directly draggable.
- No dragging of graph points is required in Practice Mode; graph updates occur through indicator input fields.

## 13. Completion checklist

The model meets the brief when:

- A random sample data set appears on opening in Learning Mode.
- Students can edit the data by typing a horizontal list of non-negative values, including decimals and repeats.
- Valid edits update the numerical outputs and Learning Mode visualisations together.
- The model displays and explains mean, mode, median, IQR, range, outliers, population standard deviation and skew; Q1 and Q3 are labelled on the visualisations and explained with quartiles/IQR.
- Quartiles follow the specified median-of-halves method, excluding the overall median from each half for odd-sized data sets.
- Outliers are determined using the 1.5 × IQR fences.
- Mode edge cases are described as no mode or multimodal as appropriate.
- Each Learning Mode indicator has a short explanation and a ?-opened worked example based on the current data.
- The box plot, cumulative frequency graph, stem-and-leaf plot and descriptive distribution curve are available and clearly labelled.
- Learning Mode observation points can be dragged on the box plot, cumulative-frequency graph and distribution curve; all views update together.
- Cumulative-frequency graphs use an ogive and points without columns.
- A less-informative graph remains visible and includes an explanatory note.
- Each indicator has a consistent colour across its value, explanation and relevant visual features.
- Practice Mode creates a fixed random question with at most 20 data values and a random context.
- Practice Mode visibly presents its fixed data set, asks for mode and the other 7 answers, and awards one point for each correct answer.
- Practice Mode accumulates scores across questions; resubmitting a question replaces its previous score and does not increase the question count.
- New Question is a plus button at the upper-left of the Practice question tile; the score bar has a circular-arrow reset button.
- Practice Mode has an enlarged cumulative-frequency graph and contextual help beside each five-number-summary input.
- Meta Mode automatically graphs and calculates indicators from the submitted per-question scores.
- Submission gives item-by-item correctness, the question score, cumulative points, question count and worked solutions.
- Rounding to two decimal places is stated in a small note in the interface.