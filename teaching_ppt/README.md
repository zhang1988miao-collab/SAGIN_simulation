# 《新一代移动通信系统（双语）》教学PPT模板

Teaching slide templates for *Next-Generation Mobile Communication Systems* (course 26070083,
bilingual), built from the course syllabus (课程教学大纲). Every deck is 16:9 and bilingual:
Chinese titles with English subtitles, Chinese body text with English glosses.

| 文件 File | 内容 Content | 页数 Slides |
|---|---|---|
| `Ch1_概述.pptx` | 第1章完整课件：导学；1.1 5G-6G标准演进；1.2 移动通信前沿技术简介；课程思政“中国移动通信的逆袭之路”；小结、课后自学与思考题、参考文献 | 24 |
| `Ch2_空天地一体化通信系统.pptx` | 封面、目录与本章教学要求、2.1–2.3 每小节一页空白模板、结束页 | 6 |
| `Ch3_新型收发机技术.pptx` | 封面、目录与本章教学要求、3.1–3.2 每小节一页空白模板、结束页 | 5 |
| `Ch4_太赫兹通信.pptx` | 封面、目录与本章教学要求、4.1–4.3 每小节一页空白模板、结束页 | 6 |
| `Ch5_下一代移动通信展望.pptx` | 封面、目录与本章教学要求、5.1–5.2 每小节一页空白模板、结束页 | 5 |

目录页右侧的“本章教学要求”取自大纲（学时、学习达成、支撑课程目标、教学方法、课外环节、思政融入点），
第2、3章另列配套实验。第2–5章空白页的演讲者备注中也写有该章教学要求，便于备课。

## 背景 Backgrounds

每章一套背景，按教学内容程序生成（无第三方版权图片），见 `backgrounds/`：

| 章 | 主题 | 主色 |
|---|---|---|
| 1 概述 | 蜂窝六边形与代际波纹（1G→6G） | 靛紫 |
| 2 空天地一体化 | 地球临边、卫星轨道、星间链路、无人机 | 深空蓝 |
| 3 新型收发机 | 里德堡原子、圆极化螺旋波、庞加莱球、EIT能级 | 青绿 |
| 4 太赫兹通信 | 啁啾波束、电磁频谱、笔形波束 | 品红 |
| 5 展望 | 地平线日出、透视网格、未来网络 | 暮光紫金 |

每章三张：`chN_cover.jpg`（封面、结束页）、`chN_dark.jpg`（目录、节标题）、`chN_light.jpg`（内容页）。

## 使用 Using the templates

- 每个文件都带6个版式：封面、目录、节标题、标题和内容、仅标题、结束页（另有空白版式）。
  在 PowerPoint“开始 → 新建幻灯片”中选用即可，背景和字号随版式自动套用。
- 主题字体：中文“微软雅黑”，西文 Arial；主题色按章设置。可在“设计 → 变体 → 字体/颜色”统一修改。
- 第1章每页附演讲者备注（讲解要点与数据来源）。

## 第1章资料说明 Sources for Chapter 1

统计数据截至2026年10月：5G基站525.4万座（2026年9月末，国新办发布会 2026-10-20）；5G用户13.11亿户、
占比70.9%（工信部，2026年8月末）；5G标准必要专利声明量占比42%（工信部，2025年数据）；
5G-A在330多个城市商用（GSMA《2026中国移动经济发展》）；Starlink在轨工作卫星约1万颗、国网与千帆星座在轨约480颗
（公开跟踪数据，2026年10月）。标准与指标依据 ITU-R M.2083、M.2160，3GPP Rel-21 时间表（TSG#112，2026年6月），
ITU-R WP 5D IMT-2030 提交时间表。完整文献列表见第1章“参考文献”页。数据会更新，授课前建议核对最新值。

大纲第2章思政融入点原文为“低空经济已领空天地一体化通信”，模板中按“低空经济引领空天地一体化通信”书写。

## 重新生成 Rebuilding

需要 Python 3（numpy、Pillow）和 Node.js 18+。

```bash
cd teaching_ppt/scripts
pip install numpy pillow
npm install
python3 make_backgrounds.py ../backgrounds   # 15 background images
node build_decks.js ../backgrounds ..          # 5 decks
```

课程名称、各章小节、教学要求和第1章内容都在 `scripts/build_decks.js` 顶部的 `CHAPTERS` 与 `buildChapter1` 中，
修改后重新运行即可。
