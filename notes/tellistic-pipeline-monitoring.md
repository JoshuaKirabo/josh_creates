# Monitoring the Tellistic survey pipeline

## When the run monitor comes in

The ADF run monitor becomes relevant when the storage event trigger starts a pipeline run. In the diagram, the dotted line branches from the trigger to the monitor while the other branch launches the notebook. The monitor stays active through the notebook, Copy Data, and the final SQL load. The 53-second loop illustrates the sequence. Actual execution time is recorded for each run.

## Azure Data Factory

- **Trigger.** AzCopy uploads or overwrites `/container9/folder9/data.csv` in ADLS Gen2. A matching Blob Created event starts the pipeline. The trigger filters the raw input path so the notebook’s output in `updated_data3/` does not start another run. [Azure storage event triggers](https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-event-trigger)
- **Run history.** In ADF Studio, open **Monitor → Pipeline runs** to see the trigger, start and end times, duration, and status. Open the run to inspect `notebook11` and Copy Data individually. Refresh the list for the latest status. Scheduled and **Trigger Now** runs also appear here. Use **Trigger runs** to investigate a trigger and the **Debug** tab for debug results. [ADF monitoring guide](https://learn.microsoft.com/en-us/azure/data-factory/monitor-visually)
- **Data Flow Debug.** In a workflow that uses ADF mapping data flows, the debug-session monitor shows active Spark sessions and their remaining time to live. The default AutoResolve configuration has a 60-minute idle timeout. This project runs its PySpark transformation in Databricks. [Mapping data flow debug mode](https://learn.microsoft.com/en-us/azure/data-factory/concepts-data-flow-debug-mode)

## How Data Factory starts the Databricks notebook

The notebook activity uses a **linked service**, a reusable Data Factory connection that specifies the Databricks workspace and compute. In this pipeline, Data Factory presents a Databricks **personal access token (PAT)** to authenticate its request to run the notebook. Once running, the notebook gets a separate service principal credential through its Key Vault-backed secret scope to read and write the lake files. [Databricks linked services](https://learn.microsoft.com/en-us/azure/data-factory/compute-linked-services#azure-databricks-linked-service)

## SurveyCTO field intake

- **Quality checks.** A field manager can configure rules under **Monitor → Automated quality checks** and run them nightly or on demand. Possible rules include flagging interviews under 100 seconds, unusually long or short interviews, or differences in consent rates across enumerators. These are examples of configurable checks. [SurveyCTO quality checks](https://docs.surveycto.com/04-monitoring-and-management/02-managing-for-quality/02.monitoring-quality.html)
- **Interactive review.** Open **Monitor → Monitor form data** to inspect summaries, cross-tabs, and maps in Data Explorer. For an encrypted form, viewing protected fields requires the form’s private key in the browser. This review can happen before the CSV export, independently of the Azure run. [SurveyCTO Data Explorer](https://docs.surveycto.com/04-monitoring-and-management/01-the-basics/03a.using-data-explorer.html)

**Follow-up question:** Should a failed ADF pipeline run send an email alert, and who should receive it?
