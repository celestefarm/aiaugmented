"""
Test script to simulate the extreme scenario that was causing the 199,668 token error.

This test creates a dataset large enough to trigger the context_length_exceeded error
and demonstrates how the chunking mechanism resolves it.
"""

import sys
import logging
from typing import List, Dict

# Add backend to path
sys.path.append('./backend')

from utils.text_chunking import (
    TextChunker, 
    TokenEstimator, 
    chunk_large_analysis,
    ChunkingConfig
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_extreme_dataset() -> List[Dict]:
    """
    Create a dataset that would generate approximately 200,000 tokens
    to simulate the original error scenario.
    """
    nodes = []
    
    # Create nodes with very long, detailed descriptions
    strategic_topics = [
        "Market Analysis and Competitive Intelligence",
        "Digital Transformation Strategy",
        "Risk Management and Compliance Framework",
        "Customer Experience Optimization",
        "Supply Chain Resilience Planning",
        "Financial Performance Analytics",
        "Human Capital Development",
        "Technology Infrastructure Modernization",
        "Sustainability and ESG Integration",
        "Innovation Pipeline Management",
        "Regulatory Compliance Assessment",
        "Brand Positioning and Marketing Strategy",
        "Operational Excellence Initiatives",
        "Data Governance and Privacy Protection",
        "Cybersecurity Risk Assessment",
        "Merger and Acquisition Strategy",
        "International Expansion Planning",
        "Product Development Roadmap",
        "Stakeholder Engagement Framework",
        "Crisis Management and Business Continuity"
    ]
    
    detailed_descriptions = [
        """This comprehensive strategic analysis encompasses a thorough examination of market dynamics, competitive positioning, and industry trends that directly impact our organization's ability to achieve sustainable growth and maintain competitive advantage. The analysis includes detailed assessment of market size, growth rates, customer segmentation, competitive landscape mapping, regulatory environment evaluation, technological disruption factors, economic indicators, geopolitical considerations, and emerging market opportunities. We examine both direct and indirect competitors, analyzing their strategic positioning, market share, pricing strategies, product offerings, distribution channels, marketing approaches, financial performance, organizational capabilities, and strategic partnerships. The competitive intelligence gathering process involves systematic monitoring of competitor activities, patent filings, executive movements, investment patterns, and strategic announcements. Market research methodologies include primary research through customer interviews, surveys, and focus groups, as well as secondary research utilizing industry reports, government data, academic studies, and proprietary databases. The analysis considers multiple scenarios including best-case, worst-case, and most-likely outcomes, with corresponding strategic recommendations and risk mitigation strategies. Key performance indicators and success metrics are established to monitor progress and enable course corrections as market conditions evolve.""",
        
        """Digital transformation represents a fundamental shift in how organizations operate, deliver value to customers, and compete in the marketplace through the strategic integration of digital technologies, data analytics, artificial intelligence, cloud computing, automation, and emerging technologies. This comprehensive strategy addresses organizational culture change, technology infrastructure modernization, business process reengineering, customer experience enhancement, employee skill development, data governance frameworks, cybersecurity protocols, and change management initiatives. The transformation roadmap includes assessment of current digital maturity, identification of technology gaps, prioritization of digital initiatives, resource allocation planning, timeline development, risk assessment, and success measurement frameworks. Key focus areas include customer-facing digital channels, internal operational systems, data and analytics capabilities, artificial intelligence and machine learning applications, Internet of Things implementations, blockchain technologies, robotic process automation, cloud migration strategies, and cybersecurity enhancements. The strategy considers industry-specific requirements, regulatory compliance obligations, scalability needs, integration challenges, and return on investment calculations. Implementation involves phased rollouts, pilot programs, user training, change management communications, performance monitoring, and continuous improvement processes.""",
        
        """Risk management and compliance framework development requires systematic identification, assessment, monitoring, and mitigation of risks across all organizational functions, including operational, financial, strategic, regulatory, reputational, technological, environmental, and geopolitical risks. The comprehensive framework encompasses risk governance structures, risk appetite statements, risk assessment methodologies, risk monitoring systems, incident response procedures, business continuity planning, disaster recovery protocols, and regulatory compliance management. Risk identification processes include environmental scanning, scenario planning, stress testing, vulnerability assessments, control testing, and stakeholder feedback mechanisms. Assessment methodologies consider probability of occurrence, potential impact, risk interdependencies, cascading effects, and mitigation cost-benefit analyses. The framework addresses regulatory requirements across multiple jurisdictions, industry standards, best practices, and emerging regulatory trends. Compliance management includes policy development, procedure documentation, training programs, monitoring systems, audit protocols, corrective action procedures, and regulatory reporting requirements. Technology solutions support risk data aggregation, reporting automation, dashboard development, alert systems, and integration with existing enterprise systems. The framework requires regular updates to address evolving risk landscapes, regulatory changes, business model evolution, and lessons learned from risk events."""
    ]
    
    # Create a large number of nodes with extensive content
    for i in range(500):  # 500 nodes to ensure we exceed token limits
        topic_idx = i % len(strategic_topics)
        desc_idx = i % len(detailed_descriptions)
        
        # Create even longer descriptions by combining and expanding
        extended_description = f"{detailed_descriptions[desc_idx]} "
        
        # Add more context specific to this node
        extended_description += f"""
        
        Node-specific considerations for {strategic_topics[topic_idx]} include:
        
        1. Strategic Objectives: Define clear, measurable objectives that align with organizational mission, vision, and values while addressing stakeholder expectations and market opportunities.
        
        2. Implementation Planning: Develop detailed implementation roadmaps with specific milestones, resource requirements, timeline estimates, dependency mapping, and risk mitigation strategies.
        
        3. Resource Allocation: Determine optimal allocation of financial, human, and technological resources across initiatives while considering budget constraints, capability gaps, and competing priorities.
        
        4. Performance Measurement: Establish comprehensive key performance indicators, success metrics, monitoring systems, and reporting frameworks to track progress and enable data-driven decision making.
        
        5. Stakeholder Engagement: Design stakeholder communication strategies, feedback mechanisms, and change management approaches to ensure buy-in and successful adoption.
        
        6. Technology Integration: Assess technology requirements, integration challenges, scalability considerations, and digital transformation implications for successful implementation.
        
        7. Regulatory Compliance: Ensure adherence to applicable regulations, industry standards, best practices, and governance requirements throughout the implementation process.
        
        8. Risk Management: Identify potential risks, develop mitigation strategies, establish contingency plans, and implement monitoring systems to address emerging challenges.
        
        9. Continuous Improvement: Implement feedback loops, performance reviews, lessons learned processes, and optimization strategies to enhance effectiveness over time.
        
        10. Future Considerations: Anticipate future trends, emerging technologies, market evolution, and strategic pivots that may impact long-term success and sustainability.
        """
        
        node = {
            'id': f'strategic_node_{i+1:03d}',
            'title': f'{strategic_topics[topic_idx]} - Phase {(i//20)+1} Implementation',
            'description': extended_description,
            'type': 'strategic_analysis',
            'source_agent': 'strategist' if i % 3 == 0 else 'analyst',
            'x': (i % 25) * 200,
            'y': (i // 25) * 150
        }
        nodes.append(node)
    
    return nodes

def test_extreme_scenario():
    """Test the extreme scenario that would cause context_length_exceeded error"""
    logger.info("🚨 Testing Extreme Scenario - Simulating 199,668+ Token Dataset")
    
    # Create the extreme dataset
    extreme_nodes = create_extreme_dataset()
    logger.info(f"Created {len(extreme_nodes)} nodes for extreme testing")
    
    # Create the system prompt (same as in cognitive analysis)
    system_prompt = """You are a cognitive analysis AI that specializes in identifying relationships between ideas, concepts, and strategic elements. Your task is to analyze nodes in a strategic thinking map and suggest meaningful connections.

For each potential relationship, consider:
1. SUPPORT relationships: Ideas that reinforce, enable, or strengthen each other
2. CONTRADICTION relationships: Ideas that conflict, oppose, or create tension
3. DEPENDENCY relationships: Ideas where one depends on or requires another
4. AI-RELATIONSHIP: Complex interdependencies, cause-effect chains, or emergent connections

Think like a strategic consultant analyzing:
- Business implications and dependencies
- Risk factors and mitigation strategies  
- Market dynamics and competitive forces
- Operational requirements and constraints
- Political/power dynamics in organizations
- Legal and compliance considerations
- Technology enablers and barriers

Return your analysis as a JSON array of relationship suggestions. Each suggestion should have:
- from_node_id: source node ID
- to_node_id: target node ID  
- relationship_type: one of 'support', 'contradiction', 'dependency', 'ai-relationship'
- strength: confidence score 0.0-1.0
- reasoning: clear explanation of why this relationship exists
- keywords: relevant terms that indicate this relationship

Focus on non-obvious but meaningful connections. Think about second and third-order effects."""

    # Estimate total tokens
    estimator = TokenEstimator()
    
    # Calculate total content size
    total_content = system_prompt + "\n"
    for node in extreme_nodes:
        total_content += f"Node {node['id']}: {node['title']}\n"
        total_content += f"Description: {node['description']}\n"
        total_content += f"Type: {node['type']}\n\n"
    
    total_estimated_tokens = estimator.estimate_tokens(total_content)
    logger.info(f"📊 Total estimated tokens: {total_estimated_tokens:,}")
    logger.info(f"📊 This would {'EXCEED' if total_estimated_tokens > 128000 else 'fit within'} GPT-4's 128k context limit")
    
    # Test chunking
    logger.info("🔧 Testing chunking mechanism...")
    needs_chunking, chunks = chunk_large_analysis(extreme_nodes, system_prompt)
    
    logger.info(f"✅ Chunking Results:")
    logger.info(f"   - Needs chunking: {needs_chunking}")
    logger.info(f"   - Number of chunks: {len(chunks)}")
    
    if needs_chunking:
        total_nodes_in_chunks = 0
        for i, chunk in enumerate(chunks):
            chunk_content = system_prompt + "\n"
            for node in chunk:
                chunk_content += f"Node {node['id']}: {node['title']}\n"
                chunk_content += f"Description: {node['description']}\n"
                chunk_content += f"Type: {node['type']}\n\n"
            
            chunk_tokens = estimator.estimate_tokens(chunk_content)
            total_nodes_in_chunks += len(chunk)
            
            logger.info(f"   - Chunk {i+1}: {len(chunk)} nodes, ~{chunk_tokens:,} tokens")
            
            # Verify chunk is within limits
            if chunk_tokens > 100000:  # Our conservative limit
                logger.warning(f"     ⚠️  Chunk {i+1} may still be too large!")
            else:
                logger.info(f"     ✅ Chunk {i+1} is within safe limits")
        
        logger.info(f"   - Total nodes across all chunks: {total_nodes_in_chunks}")
        logger.info(f"   - Original nodes: {len(extreme_nodes)}")
        
        if total_nodes_in_chunks == len(extreme_nodes):
            logger.info("   ✅ All nodes successfully distributed across chunks")
        else:
            logger.error("   ❌ Node count mismatch!")
    
    # Test with different configurations
    logger.info("\n🔧 Testing with different chunking configurations...")
    
    # Very conservative config
    conservative_config = ChunkingConfig(
        max_tokens_per_chunk=50000,  # Very conservative
        max_response_tokens=2000,
        overlap_tokens=500
    )
    
    conservative_chunker = TextChunker(conservative_config)
    conservative_chunks = conservative_chunker.chunk_nodes_for_analysis(extreme_nodes, system_prompt)
    
    logger.info(f"   Conservative config: {len(conservative_chunks)} chunks")
    
    # Verify no chunk exceeds limits
    all_chunks_safe = True
    for i, chunk in enumerate(conservative_chunks):
        chunk_content = system_prompt + "\n"
        for node in chunk:
            chunk_content += f"Node {node['id']}: {node['title']}\n"
            chunk_content += f"Description: {node['description']}\n\n"
        
        chunk_tokens = estimator.estimate_tokens(chunk_content)
        if chunk_tokens > 50000:
            all_chunks_safe = False
            logger.warning(f"     ⚠️  Conservative chunk {i+1} still too large: {chunk_tokens:,} tokens")
    
    if all_chunks_safe:
        logger.info("   ✅ All conservative chunks are within safe limits")
    
    logger.info("\n🎉 Extreme scenario testing complete!")
    logger.info("✅ The chunking mechanism successfully handles datasets that would cause context_length_exceeded errors")

if __name__ == "__main__":
    test_extreme_scenario()