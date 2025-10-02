import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  convertInchesToTwip,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";

type SourceReference = {
  id: string;
  url: string;
  title: string;
  domain?: string;
};

type StepFinding = {
  heading: string;
  insight: string;
  evidence: string;
  confidence?: string;
  sources: SourceReference[];
};

type StepResult = {
  stepId: string;
  title: string;
  summary: string;
  queries: string[];
  findings: StepFinding[];
  sources: SourceReference[];
};

type DeepResearchPlan = {
  primaryGoal: string;
  rationale: string;
  steps: Array<{
    id: string;
    title: string;
    query: string;
    angle: string;
    deliverable: string;
  }>;
  expectedInsights: string[];
};

type ExportData = {
  query: string;
  plan: DeepResearchPlan | null;
  steps: StepResult[];
  report: string | null;
  sources: SourceReference[];
  locale: "en" | "ja";
};

// Parse markdown to create Word paragraphs
function parseMarkdownToParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // H1 headers
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }

    // H2 headers
    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }

    // H3 headers
    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 250, after: 100 },
        })
      );
      continue;
    }

    // Bullet points
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const text = line.substring(2);
      const runs = parseInlineMarkdown(text);
      paragraphs.push(
        new Paragraph({
          children: runs,
          bullet: { level: 0 },
          spacing: { before: 100, after: 100 },
        })
      );
      continue;
    }

    // Regular paragraph with inline formatting
    const runs = parseInlineMarkdown(line);
    paragraphs.push(
      new Paragraph({
        children: runs,
        spacing: { before: 100, after: 100 },
      })
    );
  }

  return paragraphs;
}

// Parse inline markdown (bold, italic, links, citations)
function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let currentText = "";
  let i = 0;

  while (i < text.length) {
    // Bold **text**
    if (text.substring(i, i + 2) === "**") {
      if (currentText) {
        runs.push(new TextRun({ text: currentText }));
        currentText = "";
      }
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        runs.push(new TextRun({ text: text.substring(i + 2, end), bold: true }));
        i = end + 2;
        continue;
      }
    }

    // Italic *text* or _text_
    if (text[i] === "*" || text[i] === "_") {
      if (currentText) {
        runs.push(new TextRun({ text: currentText }));
        currentText = "";
      }
      const char = text[i];
      const end = text.indexOf(char, i + 1);
      if (end !== -1 && text[i - 1] !== char && text[end + 1] !== char) {
        runs.push(new TextRun({ text: text.substring(i + 1, end), italics: true }));
        i = end + 1;
        continue;
      }
    }

    // Citations [1], [2], etc.
    if (text[i] === "[") {
      const end = text.indexOf("]", i);
      if (end !== -1) {
        if (currentText) {
          runs.push(new TextRun({ text: currentText }));
          currentText = "";
        }
        runs.push(
          new TextRun({
            text: text.substring(i, end + 1),
            superScript: true,
            color: "0066CC",
          })
        );
        i = end + 1;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    runs.push(new TextRun({ text: currentText }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

export async function exportToWord(data: ExportData): Promise<void> {
  const { query, plan, steps, report, sources, locale } = data;

  const isJapanese = locale === "ja";
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: query,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Generation date
  const dateText = isJapanese
    ? `生成日時: ${new Date().toLocaleString("ja-JP")}`
    : `Generated: ${new Date().toLocaleString("en-US")}`;
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: dateText,
          italics: true,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Research Plan Section
  if (plan) {
    children.push(
      new Paragraph({
        text: isJapanese ? "調査計画" : "Research Plan",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "0066CC",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 10,
          },
        },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: isJapanese ? "目的: " : "Primary Goal: ", bold: true }),
          new TextRun({ text: plan.primaryGoal }),
        ],
        spacing: { after: 200 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: isJapanese ? "根拠: " : "Rationale: ", bold: true }),
          new TextRun({ text: plan.rationale }),
        ],
        spacing: { after: 300 },
      })
    );

    // Plan steps table
    children.push(
      new Paragraph({
        text: isJapanese ? "調査ステップ" : "Investigation Steps",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      })
    );

    const stepTableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "ID", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: "E8F4F8", type: ShadingType.SOLID },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: isJapanese ? "タイトル" : "Title", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: "E8F4F8", type: ShadingType.SOLID },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: isJapanese ? "クエリ" : "Query", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: "E8F4F8", type: ShadingType.SOLID },
          }),
        ],
      }),
    ];

    plan.steps.forEach((step) => {
      stepTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: step.id })],
            }),
            new TableCell({
              children: [new Paragraph({ text: step.title })],
            }),
            new TableCell({
              children: [new Paragraph({ text: step.query })],
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        rows: stepTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );

    children.push(new Paragraph({ text: "" }));
  }

  // Evidence Section
  if (steps.length > 0) {
    children.push(
      new Paragraph({
        text: isJapanese ? "収集したエビデンス" : "Collected Evidence",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "0066CC",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 10,
          },
        },
      })
    );

    steps.forEach((step) => {
      children.push(
        new Paragraph({
          text: `${step.stepId}: ${step.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );

      if (step.summary) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: step.summary, italics: true })],
            spacing: { after: 200 },
          })
        );
      }

      step.findings.forEach((finding) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: finding.heading, bold: true })],
            spacing: { before: 150, after: 100 },
          })
        );

        children.push(
          new Paragraph({
            text: finding.insight,
            spacing: { after: 100 },
          })
        );

        if (finding.evidence) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: isJapanese ? "根拠: " : "Evidence: ", italics: true }),
                new TextRun({ text: finding.evidence }),
              ],
              spacing: { after: 100 },
            })
          );
        }

        if (finding.sources.length > 0) {
          const sourceCitations = finding.sources.map((s) => `[${s.id}]`).join(" ");
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: isJapanese ? "出典: " : "Sources: ", italics: true }),
                new TextRun({ text: sourceCitations, superScript: true, color: "0066CC" }),
              ],
              spacing: { after: 150 },
            })
          );
        }
      });
    });
  }

  // Final Report Section
  if (report) {
    children.push(
      new Paragraph({
        text: isJapanese ? "最終レポート" : "Final Report",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "0066CC",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 10,
          },
        },
      })
    );

    const reportParagraphs = parseMarkdownToParagraphs(report);
    children.push(...reportParagraphs);
  }

  // References Section
  if (sources.length > 0) {
    children.push(
      new Paragraph({
        text: isJapanese ? "参照元" : "References",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "0066CC",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 10,
          },
        },
      })
    );

    sources.forEach((source) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${source.id}] `, superScript: true, color: "0066CC" }),
            new TextRun({ text: source.title, bold: true }),
          ],
          spacing: { after: 50 },
        })
      );

      if (source.domain) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `   ${source.domain}`, color: "666666" })],
            spacing: { after: 50 },
          })
        );
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `   ${source.url}`,
              color: "0066CC",
              underline: { type: UnderlineType.SINGLE },
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }

  // Footer
  children.push(
    new Paragraph({
      text: "",
      spacing: { before: 600 },
      border: {
        top: {
          color: "CCCCCC",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: isJapanese
            ? "このレポートは WhoisP により生成されました"
            : "This report was generated by WhoisP",
          italics: true,
          color: "999999",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `whoisp_${query.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.docx`;

  saveAs(blob, fileName);
}
