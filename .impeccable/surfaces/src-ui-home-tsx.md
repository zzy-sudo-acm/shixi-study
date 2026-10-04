---
version: 1
slug: "src-ui-home-tsx"
primary_target: "src/ui/Home.tsx"
related_targets: ["src/ui/LearningMap.tsx","src/style.css","src/home.css"]
---

# 首页视觉改版

Mode: Operate. Scope: 首页地图、领域列表与共用浅色视觉；所有数据和编辑流程沿用现有功能。

用户希望前端有辨识度，参考当前 dot.com，要求新奇但不花哨。采用代码实现的可操作本地预览。

候选：知识图册、学习工作台、萌芽园、学习路线、白昼观测台、知识坐标场、步骤时间带。种子选择第六项；深色控制台、编码唱片和大字试样不符合浅色中文学习场景；展会目录的密度、线路图的清晰关系与定向图的图层独立性转译为地图秩序。

## Direction contract

THESIS: 首页是一张可以进入的知识坐标场；领域与真实知识结构形成记忆点。

OWN-WORLD: 白色、雾绿纸面、深墨绿文字；细线、大点与小点组成结构，宋体品牌与中文系统正文。

STORY: 用户创建领域、看见自己的知识连接、进入领域继续学习；空账户没有示例数据。

FIRST VIEWPORT: 顶部标题与创建操作；中部连续浅色地图，领域名与真实节点；下方紧凑领域列表。空态左侧操作、右侧一个可创建的起点。聚焦领域时点与线回应一次。

FORM: 知识坐标场，第六项，seed 9707f460；code-led。大点表示领域，小点表示知识，线只来自所属关系、父子关系与用户关联。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
